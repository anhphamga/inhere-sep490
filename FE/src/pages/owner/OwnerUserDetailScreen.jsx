import { useNavigate, useParams } from 'react-router-dom'
import UserDetail from '../../components/owner/UserDetail'

const OwnerUserDetailScreen = () => {
    const { userId } = useParams()
    const navigate = useNavigate()

    return <UserDetail userId={userId} onBack={() => navigate('/owner/users')} />
}

export default OwnerUserDetailScreen
