import { Route, Routes } from 'react-router-dom';
import ContactsPage from '../pages/Contacts/ContactsPage';

export const ContactStack = () => {
    return (
        <Routes>
            <Route path="*" element={<ContactsPage />} />
        </Routes>
    );
};
