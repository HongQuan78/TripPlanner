using FluentValidation;
using TripPlanner.Application.Helpers;
using TripPlanner.Application.Parameters;

namespace TripPlanner.API.Validators;

public class AttractionSearchParameterValidator : AbstractValidator<AttractionSearchParameter>
{
    public AttractionSearchParameterValidator()
    {
        RuleFor(x => x.Latitude)
        .InclusiveBetween(-90, 90)
        .WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Longitude)
        .InclusiveBetween(-180, 180)
        .WithMessage("Longitude must be between -180 and 180.");

        RuleFor(x => x.Radius)
        .InclusiveBetween(1, 100000)
        .When(x => x.Radius.HasValue)
        .WithMessage("Radius must be between 1 and 100000 meters.");

        RuleFor(x => x.Limit)
        .InclusiveBetween(1, 20)
        .When(x => x.Limit.HasValue)
        .WithMessage("Limit must be between 1 and 20.");

        RuleFor(x => x.MinRate)
        .InclusiveBetween(AttractionCategoryHelper.MinRateValue, AttractionCategoryHelper.MaxRateValue)
        .When(x => x.MinRate.HasValue)
        .WithMessage($"MinRate must be between {AttractionCategoryHelper.MinRateValue} and {AttractionCategoryHelper.MaxRateValue}.");

        RuleFor(x => x.Offset)
        .InclusiveBetween(0, 1000)
        .When(x => x.Offset.HasValue)
        .WithMessage("Offset must be between 0 and 1000.");

        RuleFor(x => x.Kinds)
        .Must(BeAllValidCategories)
        .When(x => !string.IsNullOrWhiteSpace(x.Kinds))
        .WithMessage("Kinds must be a comma-separated list of supported categories.");
    }

    private static bool BeAllValidCategories(string? kinds)
    {
        if (string.IsNullOrWhiteSpace(kinds))
        {
            return false;
        }

        var tokens = kinds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (tokens.Length == 0)
        {
            return false;
        }

        return tokens.All(AttractionCategoryHelper.IsAllowedCategory);
    }
}
