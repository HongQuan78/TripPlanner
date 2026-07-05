using FluentValidation;
using TripPlanner.Application.Parameters;

namespace TripPlanner.API.Validators;

public class LocationSearchParameterValidator : AbstractValidator<LocationSearchParameter>
{
    public LocationSearchParameterValidator()
    {
        RuleFor(x => x.Query)
        .NotEmpty()
        .WithMessage("Query is required and must contain at least 1 character.");
    }
}
