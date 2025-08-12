import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLists, getStats, discoverTrending } from '../utils/api';
import MediaCard from '../components/MediaCard';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { token, user, fetchMe } = useAuth();
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);

  const load = async () => {
    try {
      const res = await getLists(token);
      setLists(res.trackedItems || []);
      const s = await getStats(token);
      setStats(s);
      const t = await discoverTrending('movie');
      setTrending(t.slice(0, 8));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <section>
        <h3>Your Lists</h3>
        <div className="grid">
          <div className="card">
            <h4>Watching</h4>
            {lists.filter(i => i.status === 'watching').map(i => <MediaCard key={i._id} item={i} />)}
          </div>
          <div className="card">
            <h4>Plan to Watch</h4>
            {lists.filter(i => i.status === 'planToWatch').map(i => <MediaCard key={i._id} item={i} />)}
          </div>
          <div className="card">
            <h4>Completed</h4>
            {lists.filter(i => i.status === 'completed').map(i => <MediaCard key={i._id} item={i} />)}
          </div>
        </div>
      </section>

      <section>
        <h3>Trending</h3>
        <div className="grid-cards">
          {trending.map(t => (
            <Link key={t.apiId} to={`/media/movie/${t.apiId}`}>
              <div className="small-card">
                {t.poster && <img src={t.poster} alt={t.title} />}
                <div>{t.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3>Stats</h3>
        {stats ? (
          <div>
            <div>Total tracked: {stats.total}</div>
            <div>By status: {JSON.stringify(stats.byStatus)}</div>
            <div>Average rating: {stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}</div>
          </div>
        ) : <div>Loading stats...</div>}
      </section>
    </div>
  );
}
