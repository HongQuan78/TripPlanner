using Microsoft.Extensions.DependencyInjection;
using Xunit;
using TripPlanner.Application.Extensions;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.UseCases.Trip;

namespace TripPlanner.Tests;

public class ApplicationServicesRegistrationTests
{
    private static List<Type> UseCaseInterfaces() =>
        [.. typeof(ICreateTripUseCase).Assembly
            .GetTypes()
            .Where(type => type.IsInterface
                && type.IsPublic
                && type.Namespace is not null
                && type.Namespace.StartsWith("TripPlanner.Application.UseCases", StringComparison.Ordinal))
            .OrderBy(type => type.FullName, StringComparer.Ordinal)];

    [Fact]
    public void AddApplicationUseCases_RegistersEveryUseCaseInterfaceInTheAssembly()
    {
        var services = new ServiceCollection().AddApplicationUseCases();
        var registered = services.Select(descriptor => descriptor.ServiceType).ToHashSet();

        var missing = UseCaseInterfaces().Where(type => !registered.Contains(type)).ToList();

        Assert.Empty(missing);
    }

    [Fact]
    public void UseCaseInterfaceDiscovery_IsNotVacuous()
    {
        var discovered = UseCaseInterfaces();

        Assert.NotEmpty(discovered);
        Assert.Contains(typeof(ICreateTripUseCase), discovered);
    }

    [Fact]
    public void AddApplicationUseCases_RegistersDestinationResolver()
    {
        var services = new ServiceCollection().AddApplicationUseCases();

        var descriptor = Assert.Single(services, x => x.ServiceType == typeof(IDestinationResolver));

        Assert.Equal(typeof(Application.Services.DestinationResolver), descriptor.ImplementationType);
    }

    [Fact]
    public void AddApplicationUseCases_RegistersEveryUseCaseAsScoped()
    {
        var services = new ServiceCollection().AddApplicationUseCases();

        Assert.All(services, descriptor => Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime));
    }

    [Fact]
    public void AddApplicationUseCases_RegistersEachServiceTypeExactlyOnce()
    {
        var services = new ServiceCollection().AddApplicationUseCases();

        var duplicates = services
            .GroupBy(descriptor => descriptor.ServiceType)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key.Name)
            .ToList();

        Assert.Empty(duplicates);
    }
}
