namespace TripPlanner.Domain.Models;
public class Trip
{
    public int Id {get; set;}
    public string Name {get; set;}
    public DateOnly StartDate {get;set;}
    public DateOnly EndDate {get;set;}
    public List<TripDay> Days { get; set; } = [];

    public Trip(int id, string name, DateOnly startDate, DateOnly endDate)
    {
        Id = id;
        Name = name;
        StartDate = startDate;
        EndDate = endDate;
        GenerateDays();
    }

    private void GenerateDays()
    {
        for (DateOnly date = StartDate; date <= EndDate; date = date.AddDays(1))
        {
            Days.Add(new TripDay(date));
        } 
    }
}