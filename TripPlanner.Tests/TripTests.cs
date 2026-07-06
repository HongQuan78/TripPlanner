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
}
