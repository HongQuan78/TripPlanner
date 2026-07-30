using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Infrastructure.ExternalServices.Resend;
using TripPlanner.Infrastructure.Settings;

namespace TripPlanner.Infrastructure.ExternalServices.Email.Providers;

internal sealed class ResendEmailProviderModule : IEmailProviderModule
{
    public string ProviderKey => "Resend";

    public void Register(IServiceCollection services, IConfiguration configuration)
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
}
