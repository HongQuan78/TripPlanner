namespace TripPlanner.Domain.Models;

public class TripDay
{
    private readonly List<TripDayDestination> _items = [];

    public int Id { get; private set; }
    public int TripId { get; private set; }
    public DateOnly Day { get; private set; }
    public IReadOnlyList<Destination> Destinations =>
        _items.OrderBy(item => item.Position).Select(item => item.Destination).ToList();

    private TripDay() { }

    public TripDay(DateOnly day)
    {
        Day = day;
    }

    public void AddDestination(Destination destination)
    {
        _items.Add(new TripDayDestination(destination, _items.Count));
    }

    public void RemoveDestination(Destination destination)
    {
        var item = _items.FirstOrDefault(x => x.Destination == destination)
            ?? _items.FirstOrDefault(x => x.Destination.Id == destination.Id);

        if (item is null)
        {
            return;
        }

        _items.Remove(item);
        Renumber();
    }

    public void ReorderDestinations(IReadOnlyList<int> orderedDestinationIds)
    {
        for (int index = 0; index < orderedDestinationIds.Count; index++)
        {
            var item = _items.FirstOrDefault(x => x.Destination.Id == orderedDestinationIds[index]);

            if (item is not null)
            {
                item.SetPosition(index);
            }
        }
    }

    private void Renumber()
    {
        var ordered = _items.OrderBy(item => item.Position).ToList();

        for (int index = 0; index < ordered.Count; index++)
        {
            ordered[index].SetPosition(index);
        }
    }
}
