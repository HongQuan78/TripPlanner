using TripPlanner.Application.Helpers;
using Xunit;

namespace TripPlanner.Tests;

public class DateHelperTests
{
    [Fact]
    public void ToDateOnly_ValidString_ReturnsCorrectDate()
    {
        var result = DateHelper.ToDateOnly("2024-06-01");

        Assert.Equal(new DateOnly(2024, 6, 1), result);
    }

    [Fact]
    public void ToDateOnly_InvalidFormat_ThrowsFormatException()
    {
        Assert.Throws<FormatException>(() => DateHelper.ToDateOnly("01/06/2024"));
    }

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
