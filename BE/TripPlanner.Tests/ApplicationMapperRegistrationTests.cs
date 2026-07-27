using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Extensions;
using TripPlanner.Infrastructure.Mappings;

namespace TripPlanner.Tests;

public class ApplicationMapperRegistrationTests
{
    private static ServiceProvider BuildProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
                ["EmailSettings:FromAddress"] = "no-reply@tripplanner.local",
                ["EmailSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email",
                ["EmailSettings:TokenExpiryHours"] = "24",
                ["ResendSettings:ApiKey"] = "re_test_key",
                ["ResendSettings:SmtpHost"] = "smtp.resend.com",
                ["ResendSettings:SmtpPort"] = "587",
                ["ResendSettings:TimeoutMilliseconds"] = "10000"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void ApplicationMapper_ResolvesFromTheContainer()
    {
        using var root = BuildProvider();
        using var scope = root.CreateScope();

        var mapper = scope.ServiceProvider.GetRequiredService<IApplicationMapper>();

        Assert.IsType<ApplicationMapper>(mapper);
    }

    [Fact]
    public void ResolvedApplicationMapper_MapsWithoutAdditionalConfiguration()
    {
        using var root = BuildProvider();
        using var scope = root.CreateScope();
        var mapper = scope.ServiceProvider.GetRequiredService<IApplicationMapper>();

        var response = mapper.MapToDestinationResponse(
            new Destination("Louvre", 4.9, "museums", "9am-6pm", "xid-louvre"));

        Assert.Equal("Louvre", response.Name);
        Assert.Equal("xid-louvre", response.Xid);
    }
}
