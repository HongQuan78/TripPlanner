using FluentValidation;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Helpers;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Validators;

public class MoveDestinationParameterValidator : AbstractValidator<MoveDestinationParameter>
{
    public MoveDestinationParameterValidator(IValidator<MoveDestinationRequest> requestValidator)
    {
        RuleFor(x => x.Id)
        .NotEmpty()
        .WithMessage("Trip Id is required.");

        RuleFor(x => x.DestinationId)
        .GreaterThan(0)
        .WithMessage("Destination id must be greater than 0.");

        RuleFor(x => x.Date)
        .Must(DateHelper.IsValidDateOnly!)
        .WithMessage("Date must be formatted as YYYY-MM-DD.");

        RuleFor(x => x.MoveDestinationRequest)
        .NotNull()
        .WithMessage("Request body is required.")
        .SetValidator(requestValidator!);
    }
}
