using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TripPlanner.Infrastructure.Data;

public class TripPlannerDbContextFactory : IDesignTimeDbContextFactory<TripPlannerDbContext>
{
    public TripPlannerDbContext CreateDbContext(string[] args)
    {
        var envPath = FindEnvFile();
        if (envPath is not null)
            Env.Load(envPath);

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found. " +
                "Set the ConnectionStrings__DefaultConnection environment variable or provide a .env file.");

        var optionsBuilder = new DbContextOptionsBuilder<TripPlannerDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new TripPlannerDbContext(optionsBuilder.Options);
    }

    private static string? FindEnvFile()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, ".env");
            if (File.Exists(candidate))
                return candidate;
            directory = directory.Parent;
        }
        return null;
    }
}
