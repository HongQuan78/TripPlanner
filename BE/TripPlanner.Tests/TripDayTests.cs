using TripPlanner.Domain.Models;
using Xunit;

namespace TripPlanner.Tests;

public class TripDayTests
{
    private readonly TripDay _tripDay = new(new DateOnly(2024, 6, 1));

    [Fact]
    public void AddDestination_SingleDestination_AppearsInList()
    {
        var destination = new Landmark("Eiffel Tower", 4.8, "9am-11pm");

        _tripDay.AddDestination(destination);

        Assert.Single(_tripDay.Destinations);
        Assert.Contains(destination, _tripDay.Destinations);
    }

    [Fact]
    public void AddDestination_MultipleDestinations_AllAppearInList()
    {
        var landmark = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        var restaurant = new Restaurant("Le Jules Verne", 4.5, "French", false);

        _tripDay.AddDestination(landmark);
        _tripDay.AddDestination(restaurant);

        Assert.Equal(2, _tripDay.Destinations.Count);
        Assert.Contains(landmark, _tripDay.Destinations);
        Assert.Contains(restaurant, _tripDay.Destinations);
    }

    [Fact]
    public void RemoveDestination_ExistingDestination_RemovesFromList()
    {
        var destination = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        _tripDay.AddDestination(destination);

        _tripDay.RemoveDestination(destination);

        Assert.Empty(_tripDay.Destinations);
    }

    [Fact]
    public void RemoveDestination_OneOfMultiple_OnlyRemovesTarget()
    {
        var landmark = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        var restaurant = new Restaurant("Le Jules Verne", 4.5, "French", false);
        _tripDay.AddDestination(landmark);
        _tripDay.AddDestination(restaurant);

        _tripDay.RemoveDestination(landmark);

        Assert.Single(_tripDay.Destinations);
        Assert.Contains(restaurant, _tripDay.Destinations);
    }

    [Fact]
    public void Destinations_IsEmptyByDefault()
    {
        Assert.Empty(_tripDay.Destinations);
    }
}
