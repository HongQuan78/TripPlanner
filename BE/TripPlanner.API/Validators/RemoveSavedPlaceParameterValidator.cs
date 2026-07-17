using FluentValidation;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Validators;

public class RemoveSavedPlaceParameterValidator : AbstractValidator<RemoveSavedPlaceParameter>
{
    public RemoveSavedPlaceParameterValidator()
    {
        RuleFor(x => x.Id)
        .NotEmpty()
        .WithMessage("Trip Id is required.");

        RuleFor(x => x.DestinationId)
        .NotEmpty()
        .WithMessage("Destination Id is required.");
    }
}
