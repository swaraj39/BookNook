import React, { useEffect, useRef, useState } from "react";
import { MoreVertical, Star } from "lucide-react";
import { api } from "../api";
import { initials, timeAgo } from "../utils/helpers";

const COMMENT_MAX_LENGTH = 1000;
const INITIAL_FETCH_SIZE = 5;
const LOAD_MORE_SIZE = 10;

function SpinnerMini() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function Avatar({ reviewer, size = 34 }) {
  const deactivated = reviewer?.status === "inactive";
  const fallback = initials(reviewer?.fullName || "?");
  return reviewer?.avatarUrl ? (
    <img
      className={`reviews-avatar reviews-avatar-img ${deactivated ? "reviews-avatar-deactivated" : ""}`}
      src={reviewer.avatarUrl}
      alt={reviewer.fullName}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={`reviews-avatar ${deactivated ? "reviews-avatar-deactivated" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.4) }}
    >
      {fallback}
    </div>
  );
}

function StarRating({ value, onChange, readOnly = false, size = 21 }) {
  const [hoveredRating, setHoveredRating] = useState(null);
  const containerRef = useRef(null);
  const max = 5;
  const displayRating = readOnly
    ? (value ?? 0)
    : (hoveredRating ?? value ?? 0);
  const valueText =
    value == null ? "no rating selected" : `${value} out of 5 stars`;

  function getRatingFromPointer(clientX) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const relativeX = clientX - rect.left;
    const rating = Math.ceil((relativeX / rect.width) * max);
    return Math.max(1, Math.min(max, rating));
  }

  function handlePointerMove(event) {
    if (event.pointerType === "touch") return;
    const rating = getRatingFromPointer(event.clientX);
    if (rating !== hoveredRating) setHoveredRating(rating);
  }

  function handlePointerLeave() {
    setHoveredRating(null);
  }

  function handleClick(event) {
    const rating = getRatingFromPointer(event.clientX);
    onChange(rating);
  }

  function handleKeyDown(event) {
    let nextRating = value ?? 0;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        nextRating = Math.min(max, (value ?? 0) + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        nextRating = Math.max(1, (value ?? 0) - 1);
        break;
      case "Home":
        event.preventDefault();
        nextRating = 1;
        break;
      case "End":
        event.preventDefault();
        nextRating = max;
        break;
      default:
        return;
    }
    onChange(nextRating);
  }

  if (readOnly) {
    return (
      <div
        className="reviews-stars reviews-stars-readonly"
        role="img"
        aria-label={valueText}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const isActive = i <= (value ?? 0);
          return (
            <span key={i} className="reviews-star" aria-hidden="true">
              <Star
                size={size}
                className={`reviews-star-icon ${isActive ? "is-filled" : "is-empty"}`}
                strokeWidth={1.5}
              />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="reviews-stars"
      role="slider"
      tabIndex={0}
      aria-label="Rating"
      aria-valuemin={1}
      aria-valuemax={max}
      aria-valuenow={value ?? 0}
      aria-valuetext={valueText}
      aria-orientation="horizontal"
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const isActive = i <= displayRating;
        return (
          <span key={i} className="reviews-star" aria-hidden="true">
            <Star
              size={size}
              className={`reviews-star-icon ${isActive ? "is-filled" : "is-empty"}`}
              strokeWidth={1.5}
            />
          </span>
        );
      })}
    </div>
  );
}

export function Reviews({ bookId, me, notify, askConfirm }) {
  const [reviews, setReviews] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [sort, setSort] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);

  const isAdmin = me?.role === "ADMIN";
  const hasMore = reviews.length < totalElements;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadReviews(activeSort = sort, preserveScroll = false) {
    const previousScroll = preserveScroll ? listRef.current?.scrollTop ?? 0 : 0;
    setLoading(true);
    try {
      const data = await api.bookReviews(bookId, {
        sort: activeSort,
        offset: 0,
        limit: INITIAL_FETCH_SIZE,
      });
      setReviews(data.content || []);
      setTotalElements(data.totalElements || 0);
      if (preserveScroll && listRef.current) {
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = previousScroll;
        });
      } else if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    } catch (error) {
      notify(error.message || "Unable to load comments.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!bookId) return;
    loadReviews(sort);
  }, [bookId]);

  async function changeSort(nextSort) {
    if (nextSort === sort) return;
    setSort(nextSort);
    await loadReviews(nextSort);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await api.bookReviews(bookId, {
        sort,
        offset: reviews.length,
        limit: LOAD_MORE_SIZE,
      });
      const incoming = data.content || [];
      setReviews((prev) => [...prev, ...incoming]);
      setTotalElements(data.totalElements ?? totalElements);
    } catch (error) {
      notify(error.message || "Unable to load more comments.", "error");
    } finally {
      setLoadingMore(false);
    }
  }

  async function submitReview() {
    const text = newComment.trim();
    if (!text || !rating) return;
    setSubmitting(true);
    try {
      const created = await api.createReview(bookId, text, rating);
      setReviews((prev) =>
        sort === "latest" ? [created, ...prev] : [...prev, created]
      );
      setTotalElements((prev) => prev + 1);
      setNewComment("");
      setRating(null);
    } catch (error) {
      notify(error.message || "Unable to post your review.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(review) {
    setEditingId(review.id);
    setEditText(review.comment);
    setEditRating(review.rating);
    setOpenMenuId(null);
  }

  async function saveEdit(reviewId) {
    const text = editText.trim();
    if (!text || !editRating) return;
    setSavingEdit(true);
    try {
      const updated = await api.updateReview(reviewId, text, editRating);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? updated : r))
      );
      setEditingId(null);
      setEditText("");
      setEditRating(null);
      notify("Review updated.");
    } catch (error) {
      notify(error.message || "Unable to update your review.", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDelete(review) {
    setOpenMenuId(null);
    askConfirm(
      "Delete this review? This cannot be undone.",
      async () => {
        try {
          await api.deleteReview(review.id);
          setReviews((prev) => prev.filter((r) => r.id !== review.id));
          setTotalElements((prev) => Math.max(0, prev - 1));
          notify("Review deleted.");
        } catch (error) {
          notify(error.message || "Unable to delete this comment.", "error");
        }
      }
    );
  }

  const canDelete = (review) =>
    isAdmin || (me && review.reviewer?.id === me.id);

  return (
    <section className="reviews-section panel">
      <div className="panel-head reviews-head">
        <h3>Reviews</h3>
        <span className="reviews-count">
          {totalElements} review{totalElements === 1 ? "" : "s"}
        </span>
      </div>

      <div className="reviews-compose">
        <div className="reviews-rating-input">
          <span className="reviews-rating-label">Rating:</span>
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>
        <textarea
          className="reviews-textarea"
          placeholder="Add Review"
          value={newComment}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
        />
        <div className="reviews-compose-foot">
          <span className="reviews-counter">
            {newComment.length}/{COMMENT_MAX_LENGTH}
          </span>
          <button
            className="btn primary reviews-post-btn"
            onClick={submitReview}
            disabled={!newComment.trim() || !rating || submitting}
          >
            {submitting ? <><SpinnerMini /> Posting...</> : "Post Review"}
          </button>
        </div>
      </div>

      <div className="reviews-sort">
        <button
          className={`reviews-sort-btn ${sort === "latest" ? "active" : ""}`}
          onClick={() => changeSort("latest")}
        >
          Latest
        </button>
        <button
          className={`reviews-sort-btn ${sort === "earliest" ? "active" : ""}`}
          onClick={() => changeSort("earliest")}
        >
          Earliest
        </button>
      </div>

      <div className="reviews-list" ref={listRef}>
        {loading ? (
          <div className="reviews-loading">
            <SpinnerMini /> Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">
            No reviews yet. Be the first to share your thoughts!
          </p>
        ) : (
          reviews.map((review) => {
            const deactivated = review.reviewer?.status === "inactive";
            const isEditing = editingId === review.id;
            const isMine = me && review.reviewer?.id === me.id;
            const menuOpen = openMenuId === review.id;
            return (
              <div className="reviews-item" key={review.id}>
                <div className="reviews-item-head">
                  <Avatar reviewer={review.reviewer} />
                  <strong
                    className={`reviews-name ${deactivated ? "reviews-name-deactivated" : ""}`}
                  >
                    {review.reviewer?.fullName || "Unknown"}
                    {deactivated && " (deactivated)"}
                  </strong>
                  {canDelete(review) && (
                    <div
                      className="reviews-menu-wrap"
                      ref={menuOpen ? menuRef : undefined}
                    >
                      <button
                        className="reviews-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(menuOpen ? null : review.id);
                        }}
                        aria-label="Review options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen && (
                        <div className="reviews-menu">
                          {isMine && (
                            <button
                              className="reviews-menu-item"
                              onClick={() => startEditing(review)}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete(review) && (
                            <button
                              className="reviews-menu-item reviews-menu-item-danger"
                              onClick={() => requestDelete(review)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="reviews-edit">
                    <div className="reviews-rating-input">
                      <span className="reviews-rating-label">Rating:</span>
                      <StarRating value={editRating} onChange={setEditRating} size={20} />
                    </div>
                    <textarea
                      className="reviews-textarea reviews-edit-textarea"
                      value={editText}
                      maxLength={COMMENT_MAX_LENGTH}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="reviews-edit-foot">
                      <span className="reviews-counter">
                        {editText.length}/{COMMENT_MAX_LENGTH}
                      </span>
                      <div className="reviews-edit-actions">
                        <button
                          className="btn"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                            setEditRating(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn primary"
                          onClick={() => saveEdit(review.id)}
                          disabled={!editText.trim() || !editRating || savingEdit}
                        >
                          {savingEdit ? <><SpinnerMini /> Saving...</> : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {review.rating != null && (
                      <div className="reviews-rating">
                        <span className="reviews-rating-label">Rating:</span>
                        <StarRating value={review.rating} readOnly />
                      </div>
                    )}
                    <p className="reviews-comment">{review.comment}</p>
                    {review.isEdited && (
                      <span className="reviews-edited">(edited)</span>
                    )}
                    <span className="reviews-time">
                      {timeAgo(review.createdAt)}
                    </span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasMore && (
        <button
          className="reviews-load-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading..." : "── Load more comments ──"}
        </button>
      )}
    </section>
  );
}