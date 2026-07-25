using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using TripPlanner.API.Extensions;
using TripPlanner.API.Middleware;
using TripPlanner.Infrastructure.Data;

var envFile = FindEnvFile();
if (envFile is not null)
{
    Env.Load(envFile);
}

static string? FindEnvFile()
{
    var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (directory is not null)
    {
        var candidate = Path.Combine(directory.FullName, ".env");
        if (File.Exists(candidate))
        {
            return candidate;
        }
        directory = directory.Parent;
    }
    return null;
}

const string PolicyName = "AllowLocalhost";
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplicationServices(builder.Configuration)
    .AddCustomCors(PolicyName)
    .AddCustomSwagger();

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var app = builder.Build();

bool runMigrations =
    !bool.TryParse(builder.Configuration["RunMigrationsOnStartup"], out bool configuredRunMigrations)
    || configuredRunMigrations;

if (runMigrations)
{
    var migrationLogger = app.Services.GetRequiredService<ILogger<Program>>();
    const int maxAttempts = 10;
    var retryDelay = TimeSpan.FromSeconds(3);
    for (int attempt = 1; ; attempt++)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TripPlannerDbContext>();
            dbContext.Database.Migrate();
            break;
        }
        catch (Exception exception)
        {
            if (attempt >= maxAttempts)
            {
                migrationLogger.LogCritical(
                    exception,
                    "Database migration failed after {MaxAttempts} attempts. The database at ConnectionStrings:DefaultConnection is unreachable or rejected the migration; the application will not start.",
                    maxAttempts);
                throw;
            }

            migrationLogger.LogWarning(
                exception,
                "Database migration attempt {Attempt} of {MaxAttempts} failed; retrying in {RetryDelaySeconds}s.",
                attempt,
                maxAttempts,
                retryDelay.TotalSeconds);
            Thread.Sleep(retryDelay);
        }
    }
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseCustomSwagger();
}

app.UseMiddleware<LoggingMiddleware>();
app.UseCors(PolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.AddRoute();
app.MapHealthChecks("/health");
app.UseResponseCompression();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Run();
