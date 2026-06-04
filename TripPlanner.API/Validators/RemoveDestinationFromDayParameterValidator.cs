using FluentValidation;
using TripPlanner.API.Helpers;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Validators;

public class RemoveDestinationFromDayParameterValidator : AbstractValidator<RemoveDestinationFromDayParameter>
{
    public RemoveDestinationFromDayParameterValidator()
    {
        RuleFor(x => x.Id)
        .NotEmpty()
        .WithMessage("Trip Id is required.");

        RuleFor(x => x.Date)
        .Must(DateHelper.IsValidDateOnly!)
        .WithMessage("Date must be formatted as YYYY-MM-DD.");

        RuleFor(x => x.DestinationId)
        .NotEmpty()
        .WithMessage("Destination Id is required.");
    }
}