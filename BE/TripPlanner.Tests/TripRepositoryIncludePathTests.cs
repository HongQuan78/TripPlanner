using Microsoft.EntityFrameworkCore;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;
using TripPlanner.Infrastructure.Repositories;
using Xunit;

namespace TripPlanner.Tests;

public class TripRepositoryIncludePathTests
{
    private static TripPlannerDbContext CreateModelOnlyContext() =>
        new(new DbContextOptionsBuilder<TripPlannerDbContext>()
            .UseNpgsql("Host=localhost;Database=tripplanner_model_only")
            .Options);

    [Fact]
    public void DayDestinationsIncludePath_ResolvesToDestinationThroughTheBackingField()
    {
        using var context = CreateModelOnlyContext();

        var entityType = context.Model.FindEntityType(typeof(Trip));
        Assert.NotNull(entityType);

        foreach (var segment in TripRepository.DayDestinationsIncludePath.Split('.'))
        {
            var navigation = entityType.FindNavigation(segment);
            Assert.NotNull(navigation);
            entityType = navigation.TargetEntityType;
        }

        Assert.Equal(typeof(Destination), entityType.ClrType);
    }

    [Fact]
    public void DayDestinationsIncludePath_TranslatesToSqlJoiningBothTables()
    {
        using var context = CreateModelOnlyContext();

        var sql = context.Trips
            .Include(t => t.Days)
            .Include(TripRepository.DayDestinationsIncludePath)
            .Include(t => t.SavedPlaces)
            .Where(t => t.Id == 1 && t.UserId == 1)
            .ToQueryString();

        Assert.Contains("trip_days", sql, StringComparison.Ordinal);
        Assert.Contains("trip_day_destinations", sql, StringComparison.Ordinal);
        Assert.Contains("destinations", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void AnUnresolvableIncludePath_Throws()
    {
        using var context = CreateModelOnlyContext();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            context.Trips.Include("Days._renamedItems.Destination").ToQueryString());

        Assert.Contains("_renamedItems", exception.Message, StringComparison.Ordinal);
    }
}
