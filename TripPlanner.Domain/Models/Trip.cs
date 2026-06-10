namespace TripPlanner.Domain.Models;

public class Trip
{
    private readonly List<TripDay> _days = [];

    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public IReadOnlyList<TripDay> Days => _days;

    private Trip() { }

    public Trip(string name, DateOnly startDate, DateOnly endDate)
    {
        Name = name;
        StartDate = startDate;
        EndDate = endDate;
        GenerateDays();
    }

    private void GenerateDays()
    {
        for (DateOnly date = StartDate; date <= EndDate; date = date.AddDays(1))
        {
            _days.Add(new TripDay(date));
        }
    }
}
