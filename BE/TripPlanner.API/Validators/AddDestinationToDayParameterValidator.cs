using FluentValidation;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Helpers;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Validators;

public class AddDestinationToDayParameterValidator : AbstractValidator<AddDestinationToDayParameter>
{
    public AddDestinationToDayParameterValidator(IValidator<AddDestinationToDayRequest> requestValidator)
    {
        RuleFor(x => x.Id)
        .NotEmpty()
        .WithMessage("Trip Id is required.");

        RuleFor(x => x.Date)
        .Must(DateHelper.IsValidDateOnly!)
        .WithMessage("Date must be formatted as YYYY-MM-DD.");

        RuleFor(x => x.AddDestinationToDayRequest)
        .NotNull()
        .WithMessage("Request body is required.")
        .SetValidator(requestValidator!);
    }
}