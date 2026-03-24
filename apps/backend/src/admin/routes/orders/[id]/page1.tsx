import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Container } from "@medusajs/ui"

const RedirectOrderPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      navigate(`/orders/${id}/view`, { replace: true })
    }
  }, [id])

  return <Container>Redirecting...</Container>
}

export default RedirectOrderPage