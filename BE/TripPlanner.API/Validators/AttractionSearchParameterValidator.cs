using FluentValidation;
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
    }
}
