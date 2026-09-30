#!/usr/bin/env python3
"""Sample exports for the import tests, one per app Kodigo reads.

Made up, with no real person's data, but laid out exactly as each app's
real export is (files, names, columns, JSON shapes, the byte-order mark some
put in front of a CSV). The same files are copied into the iOS and Android
test suites, so all three platforms prove they send each export to the
right reader, whichever import row was tapped.

    python3 scripts/make-import-fixtures.py

TV Time's sample (tvtime.zip) is hand-made and kept as is.
"""
import io, json, os, zipfile

OUT = os.path.join(os.path.dirname(__file__), "..", "src/lib/imports/__tests__/fixtures/exports")
BOM = "﻿"
FIXED = (2026, 9, 18, 12, 0, 0)  # a fixed date in the zip, so rebuilding changes no bytes


def zip_of(name, files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for path, text in files:
            info = zipfile.ZipInfo(path, FIXED)
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, text)
    with open(os.path.join(OUT, name), "wb") as f:
        f.write(buf.getvalue())


def csv(*rows):
    return "\n".join(",".join(r) for r in rows) + "\n"


# Simkl: one JSON of shows and movies, each record wrapping its title in
# `show` / `movie` with an `ids` block. (TV Time's reader once took this for
# a "TV Time Out" export and stopped.)
simkl = {
    "shows": [
        {"added_to_watchlist_at": "2026-09-01T10:00:00Z", "last_watched_at": "2026-09-10T20:00:00Z", "user_rated_at": None, "user_rating": None,
         "status": "completed", "last_watched": None, "next_to_watch": None, "watched_episodes_count": 62, "total_episodes_count": 62, "not_aired_episodes_count": 0,
         "show": {"title": "Breaking Bad", "poster": "00/0000", "year": 2008, "runtime": 47,
                  "ids": {"simkl": 11121, "slug": "breaking-bad", "imdb": "tt0903747", "tmdb": "1396", "tvdb": "81189"}},
         "seasons": [{"number": 1, "episodes": [{"number": 1, "watched_at": "2026-09-02T20:00:00Z"}, {"number": 2, "watched_at": "2026-09-03T20:00:00Z"}]}],
         "is_rewatch": False},
        {"added_to_watchlist_at": "2026-09-05T10:00:00Z", "last_watched_at": None, "user_rated_at": None, "user_rating": None,
         "status": "plantowatch", "watched_episodes_count": 0, "total_episodes_count": 10, "not_aired_episodes_count": 0,
         "show": {"title": "Severance", "poster": "00/0001", "year": 2022, "runtime": 50,
                  "ids": {"simkl": 1500000, "slug": "severance", "imdb": "tt11280740", "tmdb": "95396", "tvdb": "371980"}},
         "is_rewatch": False},
    ],
    "movies": [
        {"added_to_watchlist_at": "2026-09-06T10:00:00Z", "last_watched_at": "2026-09-06T22:00:00Z", "user_rated_at": "2026-09-06T22:05:00Z", "user_rating": 9,
         "status": "completed", "watched_episodes_count": 0, "total_episodes_count": 0, "not_aired_episodes_count": 0,
         "movie": {"title": "Arrival", "poster": "00/0002", "year": 2016, "runtime": 116,
                   "ids": {"simkl": 400000, "slug": "arrival", "imdb": "tt2543164", "tmdb": "329865"}},
         "is_rewatch": False},
    ],
}
zip_of("simkl.zip", [("SimklBackup.json", json.dumps(simkl, indent=2))])

# Refract: a backup of `data/*.jsonl`, `readable/*.csv`, a manifest and a
# README. Its readable/episodes.csv has title, season and episode columns
# (which TV Time's reader once took for a "Liberator" CSV).
zip_of("refract.zip", [
    ("manifest.json", json.dumps({"app": "refract", "version": "3.0", "exported_at": "2026-09-18T12:00:00Z", "files": ["data/library.jsonl"]}, indent=2)),
    ("README.md", "# Refract backup\n\nSample.\n"),
    ("data/library.jsonl", json.dumps({"tmdb_id": 1396, "media_type": "tv", "status": "watching"}) + "\n"),
    ("readable/profile.csv", BOM + csv(["username", "display_name", "bio"], ["sample_user", "Sample", ""])),
    ("readable/library.csv", BOM + csv(
        ["title", "year", "media_type", "tmdb_id", "status", "rating", "progress_season", "progress_episode", "progress_percent", "rewatch_count", "watched_episodes", "mood_tags", "watch_context", "is_public", "last_watched_at", "source", "added_at"],
        ["Breaking Bad", "2008", "tv", "1396", "watching", "", "1", "2", "3", "0", "2", "", "", "false", "2026-09-03T20:00:00.000Z", "refract", "2026-09-01T10:00:00.000Z"],
        ["Arrival", "2016", "movie", "329865", "completed", "5", "", "", "100", "0", "", "", "", "false", "2026-09-06T22:00:00.000Z", "refract", "2026-09-06T10:00:00.000Z"],
    )),
    ("readable/episodes.csv", BOM + csv(
        ["title", "year", "media_type", "tmdb_id", "season", "episode", "watched", "watched_at", "watched_at_tz", "rating", "review", "mood_tags", "rewatch_count", "is_special", "imported", "runtime_minutes"],
        ["Breaking Bad", "2008", "tv", "1396", "1", "1", "true", "2026-09-02 20:00", "UTC", "", "", "", "0", "false", "false", "58"],
        ["Breaking Bad", "2008", "tv", "1396", "1", "2", "true", "2026-09-03 20:00", "UTC", "", "", "", "0", "false", "false", "48"],
    )),
    ("readable/ratings.csv", BOM + csv(
        ["title", "year", "media_type", "tmdb_id", "target_type", "target_id", "season", "episode", "value", "visibility", "mood_tags", "watch_context", "completed_on", "source", "imported", "created_at"],
        ["Arrival", "2016", "movie", "329865", "movie", "00000000-0000-0000-0000-000000000001", "", "", "5", "public", "", "", "", "refract", "false", "2026-09-06T22:05:00.000Z"],
    )),
    ("readable/favorites.csv", BOM + csv(
        ["kind", "title", "year", "media_type", "tmdb_id", "season", "episode", "episode_name", "person_name", "sort_order", "created_at"],
        ["s", "Breaking Bad", "", "tv", "1396", "", "", "", "", "", "2026-09-04T10:00:00.000Z"],
    )),
    ("readable/diary.csv", BOM + csv(["title", "year", "media_type", "tmdb_id", "action", "at"])),
    ("readable/lists.csv", BOM + csv(["list_id", "name", "description"])),
])

# Sofa Time: one JSON array per shelf, named with the export's timestamp in
# brackets; the empty shelves hold `[\n\n]`.
stamp = "(2026_09_18_12_00_00)"
sofa_show = [{"genres": ["Drama"], "imdb": "tt0903747", "runtime": 47, "tmdb": 1396, "addedDate": "2026-09-01T10:00:00Z", "title": "Breaking Bad", "release_date": "2008-01-20T00:00:00Z", "type": "show",
              "seasons": [{"number": 1, "episodes": [{"number": 1, "addedDate": "2026-09-02T20:00:00Z"}, {"addedDate": "2026-09-03T20:00:00Z", "number": 2}]}]}]
sofa_movie = [{"genres": ["Drama"], "imdb": "tt2543164", "runtime": 116, "tmdb": 329865, "addedDate": "2026-09-06T10:00:00Z", "rating": 9, "title": "Arrival", "release_date": "2016-11-11T00:00:00Z", "type": "movie"}]
sofa_later = [{"genres": ["Thriller"], "imdb": "tt11280740", "runtime": 50, "tmdb": 95396, "addedDate": "2026-09-05T10:00:00Z", "title": "Severance", "release_date": "2022-02-18T00:00:00Z", "type": "show"}]
empty = "[\n\n]"
zip_of("sofatime.zip", [
    (f"watchlistMovie_{stamp}.json", empty),
    (f"watchlistShow_{stamp}.json", json.dumps(sofa_later, indent=2)),
    (f"watchedMovie_{stamp}.json", json.dumps(sofa_movie, indent=2)),
    (f"watchedShow_{stamp}.json", json.dumps(sofa_show, indent=2)),
    (f"stopWatchingMovie_{stamp}.json", empty),
    (f"stopWatchingShow_{stamp}.json", empty),
])

# Bingers: four CSVs, each opening with a byte-order mark.
zip_of("bingers.zip", [
    ("library.csv", BOM + csv(
        ["type", "title", "original_title", "year", "tvdb_id", "tmdb_id", "favorite", "list_status", "added_at", "for_later_at", "stopped_watching_at", "hidden_at"],
        ["show", "Breaking Bad", "Breaking Bad", "2008", "81189", "1396", "no", "following", "2026-09-01T10:00:00.000Z", "", "", ""],
        ["movie", "Arrival", "Arrival", "2016", "", "329865", "yes", "following", "2026-09-06T10:00:00.000Z", "", "", ""],
    )),
    ("watches.csv", BOM + csv(
        ["type", "title", "tvdb_id", "tmdb_id", "season_number", "episode_number", "first_watched_at", "last_watched_at", "plays"],
        ["episode", "Breaking Bad", "81189", "1396", "1", "1", "2026-09-02T20:00:00.000Z", "2026-09-02T20:00:00.000Z", "1"],
        ["episode", "Breaking Bad", "81189", "1396", "1", "2", "2026-09-03T20:00:00.000Z", "2026-09-03T20:00:00.000Z", "1"],
        ["movie", "Arrival", "", "329865", "", "", "2026-09-06T22:00:00.000Z", "2026-09-06T22:00:00.000Z", "1"],
    )),
    ("ratings.csv", BOM + csv(
        ["type", "title", "tvdb_id", "tmdb_id", "season_number", "episode_number", "rating", "favorite_character", "emotions"],
        ["episode", "Breaking Bad", "81189", "1396", "1", "1", "4", "", ""],
    )),
    ("lists.csv", BOM + csv(["list_name", "list_description", "title", "type", "tvdb_id", "tmdb_id"])),
])

# Letterboxd: films only, a folder of CSVs.
zip_of("letterboxd.zip", [
    ("profile.csv", csv(["Date Joined", "Username", "Given Name"], ["2020-01-01", "sample_user", "Sample"])),
    ("watched.csv", csv(["Date", "Name", "Year", "Letterboxd URI"], ["2026-09-06", "Arrival", "2016", "https://boxd.it/aaaa"], ["2026-09-07", "Parasite", "2019", "https://boxd.it/bbbb"])),
    ("ratings.csv", csv(["Date", "Name", "Year", "Letterboxd URI", "Rating"], ["2026-09-06", "Arrival", "2016", "https://boxd.it/aaaa", "4.5"])),
    ("watchlist.csv", csv(["Date", "Name", "Year", "Letterboxd URI"], ["2026-09-08", "Dune: Part Two", "2024", "https://boxd.it/cccc"])),
    ("diary.csv", csv(["Date", "Name", "Year", "Letterboxd URI", "Rating", "Rewatch", "Tags", "Watched Date"])),
])

# Not a watch history at all: must be refused, not imported as nothing.
zip_of("not-an-export.zip", [("notes.txt", "Shopping: milk, bread.\n"), ("photo.csv", csv(["width", "height"], ["100", "200"]))])
print("wrote", sorted(os.listdir(OUT)))
