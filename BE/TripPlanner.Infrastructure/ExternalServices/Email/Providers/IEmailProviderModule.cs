using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TripPlanner.Infrastructure.ExternalServices.Email.Providers;

internal interface IEmailProviderModule
{
    string ProviderKey { get; }

    void Register(IServiceCollection services, IConfiguration configuration);
}
