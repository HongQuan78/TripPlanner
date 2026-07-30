using FluentValidation;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Validators;

public class AddSavedPlaceParameterValidator : AbstractValidator<AddSavedPlaceParameter>
{
    public AddSavedPlaceParameterValidator(IValidator<AddSavedPlaceRequest> requestValidator)
    {
        RuleFor(x => x.Id)
        .NotEmpty()
        .WithMessage("Trip Id is required.");

        RuleFor(x => x.AddSavedPlaceRequest)
        .NotNull()
        .WithMessage("Request body is required.")
        .SetValidator(requestValidator!);
    }
}
