using Xunit;
using TripPlanner.API.Validators;
using TripPlanner.Application.Parameters;

namespace TripPlanner.Tests;

public class AttractionSearchParameterValidatorTests
{
    private readonly AttractionSearchParameterValidator _validator = new();

    private static AttractionSearchParameter Base() => new() { Latitude = 48.85, Longitude = 2.35 };

    [Fact]
    public void Validate_NoFilters_IsValid()
    {
        var result = _validator.Validate(Base());

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("cultural")]
    [InlineData("cultural,historic")]
    [InlineData("cultural, historic , architecture")]
    [InlineData("natural,amusements,foods")]
    public void Validate_KnownCategories_IsValid(string kinds)
    {
        var parameter = Base() with { Kinds = kinds };

        var result = _validator.Validate(parameter);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("bogus")]
    [InlineData("cultural,bogus")]
    [InlineData("interesting_places")]
    public void Validate_UnknownCategory_IsInvalid(string kinds)
    {
        var parameter = Base() with { Kinds = kinds };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(AttractionSearchParameter.Kinds));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void Validate_MinRateWithinRange_IsValid(int minRate)
    {
        var parameter = Base() with { MinRate = minRate };

        var result = _validator.Validate(parameter);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(-1)]
    public void Validate_MinRateOutOfRange_IsInvalid(int minRate)
    {
        var parameter = Base() with { MinRate = minRate };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(AttractionSearchParameter.MinRate));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(20)]
    [InlineData(1000)]
    public void Validate_OffsetWithinRange_IsValid(int offset)
    {
        var parameter = Base() with { Offset = offset };

        var result = _validator.Validate(parameter);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1001)]
    public void Validate_OffsetOutOfRange_IsInvalid(int offset)
    {
        var parameter = Base() with { Offset = offset };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(AttractionSearchParameter.Offset));
    }
}
