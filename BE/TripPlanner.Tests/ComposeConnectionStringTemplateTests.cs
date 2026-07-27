using System.Text.RegularExpressions;
using Npgsql;
using Xunit;

namespace TripPlanner.Tests;

public class ComposeConnectionStringTemplateTests
{
    private static readonly Regex PlaceholderPattern = new(@"\$\{(?<name>[A-Za-z_][A-Za-z0-9_]*)(?::-(?<default>[^}]*))?\}");

    private static string ReadTemplate()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docker-compose.yml")))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);

        var compose = File.ReadAllText(Path.Combine(directory!.FullName, "docker-compose.yml"));
        var match = Regex.Match(compose, @"^\s*ConnectionStrings__DefaultConnection:\s*""(?<value>.*)""\s*$", RegexOptions.Multiline);

        Assert.True(match.Success, "docker-compose.yml does not declare a quoted ConnectionStrings__DefaultConnection value.");

        return match.Groups["value"].Value;
    }

    private static string Expand(IReadOnlyDictionary<string, string> environment)
    {
        return PlaceholderPattern.Replace(ReadTemplate(), match =>
        {
            var name = match.Groups["name"].Value;
            if (environment.TryGetValue(name, out var value) && !string.IsNullOrEmpty(value))
            {
                return value;
            }

            return match.Groups["default"].Value;
        });
    }

    private static Dictionary<string, string> RequiredVariables()
    {
        return new Dictionary<string, string>
        {
            ["POSTGRES_DB"] = "tripplanner",
            ["POSTGRES_USER"] = "tripplanner",
            ["POSTGRES_PASSWORD"] = "s3cret"
        };
    }

    [Fact]
    public void ComposeConnectionString_WithoutOverrides_TargetsBundledDatabaseService()
    {
        var builder = new NpgsqlConnectionStringBuilder(Expand(RequiredVariables()));

        Assert.Equal("db", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("tripplanner", builder.Database);
        Assert.Equal("tripplanner", builder.Username);
        Assert.Equal("s3cret", builder.Password);
    }

    [Fact]
    public void ComposeConnectionString_WithHostOverride_TargetsExternalDatabase()
    {
        var environment = RequiredVariables();
        environment["POSTGRES_HOST"] = "tripplanner.abc123.eu-west-1.rds.amazonaws.com";
        environment["POSTGRES_PORT"] = "6543";

        var builder = new NpgsqlConnectionStringBuilder(Expand(environment));

        Assert.Equal("tripplanner.abc123.eu-west-1.rds.amazonaws.com", builder.Host);
        Assert.Equal(6543, builder.Port);
    }

    [Fact]
    public void ComposeConnectionString_WithExtraOptions_AppliesThemOnTopOfTheHostOverride()
    {
        var environment = RequiredVariables();
        environment["POSTGRES_HOST"] = "managed.example.net";
        environment["POSTGRES_OPTIONS"] = "SSL Mode=Require;Trust Server Certificate=true";

        var builder = new NpgsqlConnectionStringBuilder(Expand(environment));

        Assert.Equal("managed.example.net", builder.Host);
        Assert.Equal(SslMode.Require, builder.SslMode);
        Assert.True(builder.TrustServerCertificate);
    }
}
