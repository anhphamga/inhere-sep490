import UsersList from '../../components/owner/UsersList'
import { useNavigate } from 'react-router-dom'

const OwnerUsersScreen = () => {
    const navigate = useNavigate()

    return <UsersList onSelectUser={(id) => navigate(`/owner/users/${id}`)} />
}

export default OwnerUsersScreen
