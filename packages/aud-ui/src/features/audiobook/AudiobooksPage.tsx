import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthorsView } from "./AuthorsView";
import { BookView } from "./BookView";
import { BooksView } from "./BooksView";

/** The audiobooks: authors, then the books of an author, then the parts of a book. The paths are relative to /audiobooks. */
const AudiobooksPage: React.FC = () => (
    <Routes>
        <Route index element={<AuthorsView />} />
        <Route path="author/:authorId" element={<BooksView />} />
        <Route path="book/:bookId" element={<BookView />} />
        <Route path="*" element={<Navigate to="/audiobooks" replace={true} />} />
    </Routes>
);

export default AudiobooksPage;
