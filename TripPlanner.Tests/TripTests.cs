using TripPlanner.Domain.Models;
using Xunit;

namespace TripPlanner.Tests;

public class TripTests
{
    [Fact]
    public void Trip_SingleDay_GeneratesOneTripDay()
    {
        var trip = new Trip("Paris", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));

        Assert.Single(trip.Days);
        Assert.Equal(new DateOnly(2024, 6, 1), trip.Days[0].Day);
    }

    [Theory]
    [InlineData("2024-06-01", "2024-06-03", 3)]
    [InlineData("2024-01-30", "2024-02-02", 4)]
    [InlineData("2024-12-30", "2024-12-31", 2)]
    public void Trip_MultiDay_GeneratesCorrectDayCount(string start, string end, int expectedCount)
    {
        var trip = new Trip("Trip", DateOnly.Parse(start), DateOnly.Parse(end));

        Assert.Equal(expectedCount, trip.Days.Count);
    }

    [Fact]
    public void Trip_MultiDay_DaysAreConsecutive()
    {
        var startDate = new DateOnly(2024, 6, 1);
        var trip = new Trip("Trip", startDate, new DateOnly(2024, 6, 5));

        for (int i = 0; i < trip.Days.Count; i++)
            Assert.Equal(startDate.AddDays(i), trip.Days[i].Day);
    }

    [Fact]
    public void Trip_Properties_AreSetCorrectly()
    {
        var start = new DateOnly(2024, 6, 1);
        var end = new DateOnly(2024, 6, 5);
        var trip = new Trip("Rome Trip", start, end);

        Assert.Equal("Rome Trip", trip.Name);
        Assert.Equal(start, trip.StartDate);
        Assert.Equal(end, trip.EndDate);
    }
}
