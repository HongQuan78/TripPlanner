using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using TripPlanner.Infrastructure.Extensions;

namespace TripPlanner.Tests;

public class RedisCacheRegistrationTests
{
    private static ServiceProvider BuildProvider(Dictionary<string, string?> overrides)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test;Username=test;Password=test",
            ["EmailSettings:FromAddress"] = "no-reply@tripplanner.local",
            ["EmailSettings:VerificationUrlBase"] = "http://localhost:5000/api/auth/verify-email",
            ["EmailSettings:TokenExpiryHours"] = "24",
            ["ResendSettings:ApiKey"] = "re_test_key",
            ["ResendSettings:SmtpHost"] = "smtp.resend.com",
            ["ResendSettings:SmtpPort"] = "587",
            ["ResendSettings:TimeoutMilliseconds"] = "10000",
            ["WikipediaSettings:BaseUrl"] = "https://en.wikipedia.org/api/rest_v1/",
            ["WikipediaSettings:TimeoutMilliseconds"] = "5000",
            ["PhotonSettings:BaseUrl"] = "https://photon.komoot.io/api/",
            ["PhotonSettings:TimeoutMilliseconds"] = "5000"
        };
        foreach (var (key, value) in overrides)
        {
            settings[key] = value;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void AddInfrastructureServices_WithoutRedisConnectionString_ResolvesInMemoryDistributedCache()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>());

        var cache = provider.GetService<IDistributedCache>();

        Assert.NotNull(cache);
    }

    [Fact]
    public async Task AddInfrastructureServices_WithoutRedisConnectionString_CacheIsUsable()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>());
        var cache = provider.GetRequiredService<IDistributedCache>();

        await cache.SetStringAsync("probe", "value");
        var stored = await cache.GetStringAsync("probe");

        Assert.Equal("value", stored);
    }

    [Fact]
    public async Task AddInfrastructureServices_WithEmptyRedisConnectionString_CacheIsUsable()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Redis"] = string.Empty
        });

        var cache = provider.GetRequiredService<IDistributedCache>();
        await cache.SetStringAsync("probe", "value");
        var stored = await cache.GetStringAsync("probe");

        Assert.Equal("value", stored);
    }

    [Fact]
    public async Task AddInfrastructureServices_WithWhitespaceRedisConnectionString_CacheIsUsable()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Redis"] = "   "
        });

        var cache = provider.GetRequiredService<IDistributedCache>();
        await cache.SetStringAsync("probe", "value");
        var stored = await cache.GetStringAsync("probe");

        Assert.Equal("value", stored);
    }

    [Fact]
    public void AddInfrastructureServices_WithRedisConnectionString_ResolvesDistributedCache()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Redis"] = "localhost:6379"
        });

        var cache = provider.GetService<IDistributedCache>();

        Assert.NotNull(cache);
    }
}
