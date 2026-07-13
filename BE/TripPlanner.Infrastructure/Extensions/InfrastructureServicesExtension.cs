using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Data;
using TripPlanner.Infrastructure.ExternalServices.Email;
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
            .ValidateOnStart();

        services.AddOptions<ResendSettings>()
            .Bind(configuration.GetSection(ResendSettings.SectionName))
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.ApiKey), "ResendSettings:ApiKey must be configured.")
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.SmtpHost), "ResendSettings:SmtpHost must be configured.")
            .Validate(settings => settings.SmtpPort > 0, "ResendSettings:SmtpPort must be greater than zero.")
            .Validate(settings => settings.TimeoutMilliseconds > 0, "ResendSettings:TimeoutMilliseconds must be greater than zero.")
            .ValidateOnStart();

        services.AddSingleton<IVerificationTokenService, VerificationTokenService>();
        services.AddScoped<IVerificationEmailContentBuilder, VerificationEmailContentBuilder>();
        services.AddScoped<IEmailSender, ResendEmailSender>();

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

        services.AddHttpClient<IGeocodingService, PhotonGeocodingService>(ConfigurePhotonClient);
        services.AddHttpClient<IWikipediaImageService, WikipediaImageService>(ConfigureWikipediaClient);
        services.AddHttpClient<IAttractionSearchService, OpenTripMapAttractionSearchService>(ConfigureOpenTripMapClient);
        services.AddHttpClient<IDestinationDetailsService, OpenTripMapDestinationDetailsService>(ConfigureOpenTripMapClient);

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
    }

    private static void ConfigurePhotonClient(IServiceProvider serviceProvider, HttpClient client)
    {
        var settings = serviceProvider.GetRequiredService<IOptions<PhotonSettings>>().Value;
        client.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMilliseconds);
        client.DefaultRequestHeaders.UserAgent.Add(new System.Net.Http.Headers.ProductInfoHeaderValue("TripPlanner", "1.0"));
    }
}
