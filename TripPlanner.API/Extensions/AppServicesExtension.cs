using Microsoft.Extensions.DependencyInjection;
using AutoMapper;
using TripPlanner.API.Services.Interface;
using TripPlanner.API.Data;
using FluentValidation;
using TripPlanner.API.Validators;
using TripPlanner.API.Services.Implementation;
using TripPlanner.API.Mappings;
using TripPlanner.API.Middleware;
namespace TripPlanner.API.Extensions;


public static class AppServicesExtension
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<MemoryDbContext>();
        services.AddScoped<IDestinationService, DestinationService>();
        services.AddScoped<ITripService, TripService>();
        services.AddScoped<ITripDayService, TripDayService>();

        services.AddValidatorsFromAssembly(typeof(CreateTripValidator).Assembly);

        services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

        services.AddProblemDetails();
        services.AddExceptionHandler<ExceptionHandlingMiddleware>();

        services.AddResponseCompression();
        return services;
    }
}