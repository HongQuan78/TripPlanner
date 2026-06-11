using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Mappings;
using TripPlanner.Infrastructure.Data;
using TripPlanner.Infrastructure.Persistence;
using TripPlanner.Infrastructure.Repositories;

namespace TripPlanner.Infrastructure.Extensions;

public static class InfrastructureServicesExtension
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        string? connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured. " +
                "Ensure a .env file exists in the solution root with ConnectionStrings__DefaultConnection set.");

        services.AddDbContext<TripPlannerDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITripRepository, TripRepository>();
        services.AddScoped<IDestinationRepository, DestinationRepository>();

        services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

        return services;
    }
}
