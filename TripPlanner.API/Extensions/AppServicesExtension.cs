using Microsoft.Extensions.DependencyInjection;
using TripPlanner.Application.UseCases;
using TripPlanner.Application.UseCases.Implementations;
using TripPlanner.Infrastructure.Extensions;
using FluentValidation;
using TripPlanner.API.Validators;
using TripPlanner.API.Middleware;
using Microsoft.Extensions.Configuration;

namespace TripPlanner.API.Extensions;

public static class AppServicesExtension
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddInfrastructureServices(configuration);

        services.AddScoped<IDestinationService, DestinationService>();
        services.AddScoped<ITripService, TripService>();
        services.AddScoped<ITripDayService, TripDayService>();

        services.AddValidatorsFromAssembly(typeof(CreateTripValidator).Assembly);

        services.AddProblemDetails();
        services.AddExceptionHandler<ExceptionHandlingMiddleware>();

        services.AddResponseCompression();
        return services;
    }
}
