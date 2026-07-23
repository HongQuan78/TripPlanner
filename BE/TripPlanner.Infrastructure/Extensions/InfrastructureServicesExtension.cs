using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Caching;
using TripPlanner.Infrastructure.Data;
using TripPlanner.Infrastructure.ExternalServices.Email;
using TripPlanner.Infrastructure.ExternalServices.Google;
using TripPlanner.Infrastructure.ExternalServices.OpenTripMap;
using TripPlanner.Infrastructure.ExternalServices.Photon;
using TripPlanner.Infrastructure.ExternalServices.Resend;
using TripPlanner.Infrastructure.ExternalServices.Wikipedia;
using TripPlanner.Infrastructure.Mappings;
using TripPlanner.Infrastructure.Persistence;
using TripPlanner.Infrastructure.Repositories;
using TripPlanner.Infrastructure.Security;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.Extensions;

public static class InfrastructureServicesExtension
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        string? connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured. " +
                "Ensure a .env file exists in the solution root with ConnectionStrings__DefaultConnection set.");
        }

        services.AddDbContext<TripPlannerDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.Configure<JwtSettings>(options =>
            configuration.GetSection(JwtSettings.SectionName).Bind(options));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITripRepository, TripRepository>();
        services.AddScoped<IDestinationRepository, DestinationRepository>();
        services.AddScoped<IUserRepository, UserRepository>();

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddSingleton<ITokenBlacklist, InMemoryTokenBlacklist>();

        services.AddOptions<EmailSettings>()
            .Bind(configuration.GetSection(EmailSettings.SectionName))
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.FromAddress), "EmailSettings:FromAddress must be configured.")
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.VerificationUrlBase), "EmailSettings:VerificationUrlBase must be configured.")
            .Validate(settings => settings.TokenExpiryHours > 0, "EmailSettings:TokenExpiryHours must be greater than zero.")
            .Validate(
                settings => string.IsNullOrWhiteSpace(settings.Provider)
                    || settings.Provider.Trim().Equals("Resend", StringComparison.OrdinalIgnoreCase)
                    || settings.Provider.Trim().Equals("Google", StringComparison.OrdinalIgnoreCase),
                "EmailSettings:Provider must be either \"Resend\" or \"Google\".")
            .ValidateOnStart();

        services.AddSingleton<IVerificationTokenService, VerificationTokenService>();
        services.AddScoped<IVerificationEmailContentBuilder, VerificationEmailContentBuilder>();

        string? providerSetting = configuration.GetSection(EmailSettings.SectionName)["Provider"];
        string emailProvider = string.IsNullOrWhiteSpace(providerSetting) ? "Resend" : providerSetting.Trim();
        if (emailProvider.Equals("Google", StringComparison.OrdinalIgnoreCase))
        {
            services.AddOptions<GoogleSmtpSettings>()
                .Bind(configuration.GetSection(GoogleSmtpSettings.SectionName))
                .Validate(settings => !string.IsNullOrWhiteSpace(settings.Username), "GoogleSmtpSettings:Username must be configured.")
                .Validate(settings => !string.IsNullOrWhiteSpace(settings.AppPassword), "GoogleSmtpSettings:AppPassword must be configured.")
                .Validate(settings => !string.IsNullOrWhiteSpace(settings.SmtpHost), "GoogleSmtpSettings:SmtpHost must be configured.")
                .Validate(settings => settings.SmtpPort > 0, "GoogleSmtpSettings:SmtpPort must be greater than zero.")
                .Validate(settings => settings.TimeoutMilliseconds > 0, "GoogleSmtpSettings:TimeoutMilliseconds must be greater than zero.")
                .ValidateOnStart();

            services.AddScoped<IEmailSender, GoogleEmailSender>();
        }
        else
        {
            services.AddOptions<ResendSettings>()
                .Bind(configuration.GetSection(ResendSettings.SectionName))
                .Validate(settings => !string.IsNullOrWhiteSpace(settings.ApiKey), "ResendSettings:ApiKey must be configured.")
                .Validate(settings => !string.IsNullOrWhiteSpace(settings.SmtpHost), "ResendSettings:SmtpHost must be configured.")
                .Validate(settings => settings.SmtpPort > 0, "ResendSettings:SmtpPort must be greater than zero.")
                .Validate(settings => settings.TimeoutMilliseconds > 0, "ResendSettings:TimeoutMilliseconds must be greater than zero.")
                .ValidateOnStart();

            services.AddScoped<IEmailSender, ResendEmailSender>();
        }

        services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());
        services.AddScoped<IApplicationMapper, ApplicationMapper>();

        services.Configure<OpenTripMapSettings>(options =>
            configuration.GetSection(OpenTripMapSettings.SectionName).Bind(options));

        services.AddOptions<WikipediaSettings>()
            .Bind(configuration.GetSection(WikipediaSettings.SectionName))
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.BaseUrl), "WikipediaSettings:BaseUrl must be configured.")
            .Validate(settings => settings.TimeoutMilliseconds > 0, "WikipediaSettings:TimeoutMilliseconds must be greater than zero.")
            .ValidateOnStart();

        services.AddOptions<PhotonSettings>()
            .Bind(configuration.GetSection(PhotonSettings.SectionName))
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.BaseUrl), "PhotonSettings:BaseUrl must be configured.")
            .Validate(settings => settings.TimeoutMilliseconds > 0, "PhotonSettings:TimeoutMilliseconds must be greater than zero.")
            .ValidateOnStart();

        var redisSettings = new RedisSettings();
        configuration.GetSection(RedisSettings.SectionName).Bind(redisSettings);
        services.Configure<RedisSettings>(options => configuration.GetSection(RedisSettings.SectionName).Bind(options));

        string? redisConnectionString = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnectionString;
                options.InstanceName = redisSettings.InstanceName;
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.AddScoped<IResponseCache, RedisResponseCache>();

        services.AddHttpClient<IGeocodingService, PhotonGeocodingService>(ConfigurePhotonClient);
        services.AddHttpClient<IDestinationImageProvider, WikipediaImageProvider>(ConfigureWikipediaClient);
        services.AddHttpClient<IOpenTripMapPlaceClient, OpenTripMapPlaceClient>(ConfigureOpenTripMapClient);
        services.AddHttpClient<IAttractionSearchService, OpenTripMapAttractionSearchService>(ConfigureOpenTripMapClient);
        services.AddScoped<IDestinationDetailsService, OpenTripMapDestinationDetailsService>();

        return services;
    }

    private static void ConfigureOpenTripMapClient(IServiceProvider serviceProvider, HttpClient client)
    {
        var settings = serviceProvider.GetRequiredService<IOptions<OpenTripMapSettings>>().Value;
        client.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMilliseconds);
    }

    private static void ConfigureWikipediaClient(IServiceProvider serviceProvider, HttpClient client)
    {
        var settings = serviceProvider.GetRequiredService<IOptions<WikipediaSettings>>().Value;
        client.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMilliseconds);
        client.DefaultRequestHeaders.UserAgent.Add(new System.Net.Http.Headers.ProductInfoHeaderValue("TripPlanner", "1.0"));
    }

    private static void ConfigurePhotonClient(IServiceProvider serviceProvider, HttpClient client)
    {
        var settings = serviceProvider.GetRequiredService<IOptions<PhotonSettings>>().Value;
        client.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMilliseconds);
        client.DefaultRequestHeaders.UserAgent.Add(new System.Net.Http.Headers.ProductInfoHeaderValue("TripPlanner", "1.0"));
    }
}
