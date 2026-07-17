using FluentValidation;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Validators;

public class AddSavedPlaceValidator : AbstractValidator<AddSavedPlaceRequest>
{
    public AddSavedPlaceValidator()
    {
        RuleFor(x => x)
        .Must(x => x.DestinationId.HasValue || !string.IsNullOrWhiteSpace(x.Xid))
        .WithMessage("Either DestinationId or Xid is required.");

        RuleFor(x => x.DestinationId)
        .GreaterThan(0)
        .When(x => x.DestinationId.HasValue)
        .WithMessage("Destination Id must be greater than 0.");
    }
}
