namespace TripPlanner.Domain.Models;

public class Trip
{
    private readonly List<TripDay> _days = [];
    private readonly List<Destination> _savedPlaces = [];

    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public int UserId { get; private set; }
    public IReadOnlyList<TripDay> Days => _days;
    public IReadOnlyList<Destination> SavedPlaces => _savedPlaces;

    private Trip() { }

    public Trip(string name, DateOnly startDate, DateOnly endDate, int userId)
    {
        Name = name;
        StartDate = startDate;
        EndDate = endDate;
        UserId = userId;
        GenerateDays();
    }

    public void Update(string name, DateOnly startDate, DateOnly endDate)
    {
        Name = name;
        StartDate = startDate;
        EndDate = endDate;
        _days.RemoveAll(day => day.Day < startDate || day.Day > endDate);
        GenerateDays();
        _days.Sort((left, right) => left.Day.CompareTo(right.Day));
    }

    public void AddSavedPlace(Destination destination) => _savedPlaces.Add(destination);

    public void RemoveSavedPlace(Destination destination) => _savedPlaces.Remove(destination);

    public void ScheduleFromSavedPlaces(Destination destination, TripDay tripDay)
    {
        _savedPlaces.Remove(destination);
        tripDay.AddDestination(destination);
    }

    private void GenerateDays()
    {
        for (DateOnly date = StartDate; date <= EndDate; date = date.AddDays(1))
        {
            if (_days.All(day => day.Day != date))
            {
                _days.Add(new TripDay(date));
            }
        }
    }
}
