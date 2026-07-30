using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TripPlanner.Infrastructure.Caching;

namespace TripPlanner.Tests;

internal static class TestCache
{
    public static IResponseCache Create()
    {
        var distributedCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        return new RedisResponseCache(distributedCache);
    }
}
