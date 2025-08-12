import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { discoverDetails, addListItem, getLists, updateListItem } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function MediaDetail() {
  const { type, id } = useParams();
  const [details, setDetails] = useState(null);
  const { token } = useAuth();
  const [status, setStatus] = useState('planToWatch');
  const [myItem, setMyItem] = useState(null);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(null);

  const load = async () => {
    const d = await discoverDetails(type, id);
    setDetails(d);
    // check if user already tracked
    const lists = await getLists(token);
    const found = lists.trackedItems.find(it => it.apiId === d.apiId && it.mediaType === d.mediaType);
    if (found) {
      setMyItem(found);
      setStatus(found.status);
      setNote(found.selfNote || '');
      setRating(found.rating || null);
    }
  };

  useEffect(() => { load(); }, [type, id]);

  const addToList = async () => {
    const res = await addListItem(token, { apiId: details.apiId, mediaType: details.mediaType, status });
    setMyItem(res.item);
  };

  const saveEdits = async () => {
    if (!myItem) return;
    const res = await updateListItem(token, myItem._id, { status, selfNote: note, rating });
    setMyItem(res.item);
  };

  return (
    <div>
      <h1>{details ? details.title : 'Loading...'}</h1>
      {details && (
        <div className="detail">
          {details.poster && <img src={details.poster} alt={details.title} className="poster" />}
          <div>
            <p>{details.overview}</p>
            <div>
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="planToWatch">Plan to Watch</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label>Rating (1-10)</label>
              <input type="number" min="1" max="10" value={rating || ''} onChange={e => setRating(e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <label>Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} />
            </div>
            {!myItem ? (
              <button onClick={addToList}>Add to My List</button>
            ) : (
              <button onClick={saveEdits}>Save</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
