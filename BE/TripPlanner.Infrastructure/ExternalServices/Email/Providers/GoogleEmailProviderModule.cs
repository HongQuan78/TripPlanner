using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.Google;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Email.Providers;

internal sealed class GoogleEmailProviderModule : IEmailProviderModule
{
    public string ProviderKey => "Google";

    public void Register(IServiceCollection services, IConfiguration configuration)
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
}
