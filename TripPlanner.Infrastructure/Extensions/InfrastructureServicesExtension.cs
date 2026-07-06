using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.Data;
using TripPlanner.Infrastructure.Email;
using TripPlanner.Infrastructure.ExternalServices.OpenTripMap;
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

        services.Configure<EmailSettings>(options =>
            configuration.GetSection(EmailSettings.SectionName).Bind(options));

        services.AddSingleton<IVerificationTokenService, VerificationTokenService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());
        services.AddScoped<IApplicationMapper, ApplicationMapper>();

        services.Configure<OpenTripMapSettings>(options =>
            configuration.GetSection(OpenTripMapSettings.SectionName).Bind(options));

        services.AddHttpClient<IGeocodingService, OpenTripMapGeocodingService>(ConfigureOpenTripMapClient);
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
}
