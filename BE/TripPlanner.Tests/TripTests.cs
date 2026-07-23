using TripPlanner.Domain.Models;
using Xunit;

namespace TripPlanner.Tests;

public class TripTests
{
    [Fact]
    public void Trip_SingleDay_GeneratesOneTripDay()
    {
        var trip = new Trip("Paris", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);

        Assert.Single(trip.Days);
        Assert.Equal(new DateOnly(2024, 6, 1), trip.Days[0].Day);
    }

    [Theory]
    [InlineData("2024-06-01", "2024-06-03", 3)]
    [InlineData("2024-01-30", "2024-02-02", 4)]
    [InlineData("2024-12-30", "2024-12-31", 2)]
    public void Trip_MultiDay_GeneratesCorrectDayCount(string start, string end, int expectedCount)
    {
        var trip = new Trip("Trip", DateOnly.Parse(start), DateOnly.Parse(end), 1);

        Assert.Equal(expectedCount, trip.Days.Count);
    }

    [Fact]
    public void Trip_MultiDay_DaysAreConsecutive()
    {
        var startDate = new DateOnly(2024, 6, 1);
        var trip = new Trip("Trip", startDate, new DateOnly(2024, 6, 5), 1);

        for (int i = 0; i < trip.Days.Count; i++)
        {
            Assert.Equal(startDate.AddDays(i), trip.Days[i].Day);
        }
    }

    [Fact]
    public void Trip_Properties_AreSetCorrectly()
    {
        var start = new DateOnly(2024, 6, 1);
        var end = new DateOnly(2024, 6, 5);
        var trip = new Trip("Rome Trip", start, end, 7);

        Assert.Equal("Rome Trip", trip.Name);
        Assert.Equal(start, trip.StartDate);
        Assert.Equal(end, trip.EndDate);
        Assert.Equal(7, trip.UserId);
    }

    [Fact]
    public void Update_ShrinkingRange_RemovesOutOfRangeDays()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 5), 1);

        trip.Update("Trip", new DateOnly(2024, 6, 2), new DateOnly(2024, 6, 3));

        Assert.Equal(2, trip.Days.Count);
        Assert.Equal(new DateOnly(2024, 6, 2), trip.Days[0].Day);
        Assert.Equal(new DateOnly(2024, 6, 3), trip.Days[1].Day);
    }

    [Fact]
    public void Update_RetainedDays_KeepTheirDestinations()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.Days.First(d => d.Day == new DateOnly(2024, 6, 2)).AddDestination(destination);

        trip.Update("Trip", new DateOnly(2024, 6, 2), new DateOnly(2024, 6, 2));

        var retained = Assert.Single(trip.Days);
        Assert.Contains(destination, retained.Destinations);
    }

    [Fact]
    public void Update_ExtendingRange_AddsNewDaysInOrder()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 2), new DateOnly(2024, 6, 3), 1);

        trip.Update("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 4));

        Assert.Equal(4, trip.Days.Count);
        for (int i = 0; i < trip.Days.Count; i++)
        {
            Assert.Equal(new DateOnly(2024, 6, 1).AddDays(i), trip.Days[i].Day);
        }
    }

    [Fact]
    public void Update_NameOnlyChange_LeavesDaysUntouched()
    {
        var trip = new Trip("Old Name", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        var originalDays = trip.Days.ToList();

        trip.Update("New Name", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3));

        Assert.Equal("New Name", trip.Name);
        Assert.Equal(originalDays, trip.Days);
    }

    [Fact]
    public void AddSavedPlace_AddsDestinationToPool()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");

        trip.AddSavedPlace(destination);

        Assert.Contains(destination, trip.SavedPlaces);
    }

    [Fact]
    public void RemoveSavedPlace_RemovesDestinationFromPool()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(destination);

        trip.RemoveSavedPlace(destination);

        Assert.Empty(trip.SavedPlaces);
    }

    [Fact]
    public void ScheduleFromSavedPlaces_MovesDestinationFromPoolToDay()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(destination);
        var tripDay = trip.Days.First();

        trip.ScheduleFromSavedPlaces(destination, tripDay);

        Assert.Empty(trip.SavedPlaces);
        Assert.Contains(destination, tripDay.Destinations);
    }

    [Fact]
    public void AddDestination_AppendsInCallOrder()
    {
        var tripDay = new TripDay(new DateOnly(2024, 6, 1));
        var first = SetId(new Landmark("First", 4.0, "9am-5pm"), 1);
        var second = SetId(new Landmark("Second", 4.1, "9am-5pm"), 2);
        var third = SetId(new Landmark("Third", 4.2, "9am-5pm"), 3);

        tripDay.AddDestination(first);
        tripDay.AddDestination(second);
        tripDay.AddDestination(third);

        Assert.Equal(new[] { first, second, third }, tripDay.Destinations);
    }

    [Fact]
    public void RemoveDestination_DropsItemAndRenumbersWithoutGaps()
    {
        var tripDay = new TripDay(new DateOnly(2024, 6, 1));
        var first = SetId(new Landmark("First", 4.0, "9am-5pm"), 1);
        var second = SetId(new Landmark("Second", 4.1, "9am-5pm"), 2);
        var third = SetId(new Landmark("Third", 4.2, "9am-5pm"), 3);
        tripDay.AddDestination(first);
        tripDay.AddDestination(second);
        tripDay.AddDestination(third);

        tripDay.RemoveDestination(second);

        Assert.Equal(new[] { first, third }, tripDay.Destinations);
    }

    [Fact]
    public void ReorderDestinations_YieldsRequestedOrder()
    {
        var tripDay = new TripDay(new DateOnly(2024, 6, 1));
        var first = SetId(new Landmark("First", 4.0, "9am-5pm"), 1);
        var second = SetId(new Landmark("Second", 4.1, "9am-5pm"), 2);
        var third = SetId(new Landmark("Third", 4.2, "9am-5pm"), 3);
        tripDay.AddDestination(first);
        tripDay.AddDestination(second);
        tripDay.AddDestination(third);

        tripDay.ReorderDestinations(new[] { 3, 1, 2 });

        Assert.Equal(new[] { third, first, second }, tripDay.Destinations);
    }

    [Fact]
    public void MoveDestinationBetweenDays_RemovesFromSourceAndAppendsToTarget()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var fromDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 1));
        var toDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 2));
        var moving = SetId(new Landmark("Moving", 4.0, "9am-5pm"), 1);
        var staying = SetId(new Landmark("Staying", 4.1, "9am-5pm"), 2);
        var existing = SetId(new Landmark("Existing", 4.2, "9am-5pm"), 3);
        fromDay.AddDestination(moving);
        fromDay.AddDestination(staying);
        toDay.AddDestination(existing);

        trip.MoveDestinationBetweenDays(moving, fromDay, toDay);

        Assert.DoesNotContain(moving, fromDay.Destinations);
        Assert.Equal(new[] { staying }, fromDay.Destinations);
        Assert.Equal(new[] { existing, moving }, toDay.Destinations);
    }

    [Fact]
    public void MoveDestinationBetweenDays_RenumbersSourceDayWithoutGaps()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var fromDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 1));
        var toDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 2));
        var first = SetId(new Landmark("First", 4.0, "9am-5pm"), 1);
        var second = SetId(new Landmark("Second", 4.1, "9am-5pm"), 2);
        var third = SetId(new Landmark("Third", 4.2, "9am-5pm"), 3);
        fromDay.AddDestination(first);
        fromDay.AddDestination(second);
        fromDay.AddDestination(third);

        trip.MoveDestinationBetweenDays(first, fromDay, toDay);
        trip.MoveDestinationBetweenDays(third, fromDay, toDay);

        Assert.Equal(new[] { second }, fromDay.Destinations);
        Assert.Equal(new[] { first, third }, toDay.Destinations);
    }

    [Fact]
    public void MoveDestinationBetweenDays_TargetAlreadyHasDestination_RemovesFromSourceWithoutDuplicating()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var fromDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 1));
        var toDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 2));
        var shared = SetId(new Landmark("Shared", 4.0, "9am-5pm"), 1);
        fromDay.AddDestination(shared);
        toDay.AddDestination(shared);

        trip.MoveDestinationBetweenDays(shared, fromDay, toDay);

        Assert.Empty(fromDay.Destinations);
        Assert.Equal(new[] { shared }, toDay.Destinations);
    }

    [Fact]
    public void MoveDestinationBetweenDays_MovingOnlyDestination_LeavesSourceEmpty()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var fromDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 1));
        var toDay = trip.Days.First(d => d.Day == new DateOnly(2024, 6, 2));
        var moving = SetId(new Landmark("Moving", 4.0, "9am-5pm"), 1);
        fromDay.AddDestination(moving);

        trip.MoveDestinationBetweenDays(moving, fromDay, toDay);

        Assert.Empty(fromDay.Destinations);
        Assert.Equal(new[] { moving }, toDay.Destinations);
    }

    private static T SetId<T>(T destination, int id) where T : Destination
    {
        typeof(Destination)
            .GetProperty(nameof(Destination.Id))!
            .SetValue(destination, id);
        return destination;
    }
}
