using System.Globalization;

namespace TripPlanner.API.Helpers;

public static class DateHelper
{   
    public const string DateFormat = "yyyy-MM-dd";
    public static DateOnly ToDateOnly(string date)
    {   
        return DateOnly.ParseExact
        (
            date, 
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None
        );
    }

    public static bool IsValidDateOnly(string date)
    {
        return DateOnly.TryParseExact(
            date,
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out _
        );
    }
}