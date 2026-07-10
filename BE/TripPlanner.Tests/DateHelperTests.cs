using TripPlanner.Application.Helpers;
using Xunit;

namespace TripPlanner.Tests;

public class DateHelperTests
{
    [Theory]
    [InlineData("2024-06-01", true)]
    [InlineData("2024-12-31", true)]
    [InlineData("2024-01-01", true)]
    [InlineData("not-a-date", false)]
    [InlineData("01/06/2024", false)]
    [InlineData("2024-13-01", false)]
    [InlineData("", false)]
    public void IsValidDateOnly_ReturnsExpectedResult(string input, bool expected)
    {
        var result = DateHelper.IsValidDateOnly(input);

        Assert.Equal(expected, result);
    }
}
