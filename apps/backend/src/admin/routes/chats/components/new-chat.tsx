"use client"

import { useEffect, useState } from "react"
import {
  Button,
  Badge,
  Input,
  FocusModal,
  Text,
  IconButton,
  DropdownMenu,
} from "@medusajs/ui"
import { CheckMini, XMarkMini } from "@medusajs/icons"

type User = {
  id: string
  firstName: string
  lastName: string
  username: string
  profile?: string
}

type Props = {
  users: User[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewChat({ users, open, onOpenChange }: Props) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) {
      setSelectedUsers([])
      setSearch("")
    }
  }, [open])

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [user] // single-select chat
    )
  }

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.username}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="w-[560px]">
        <FocusModal.Header>
          <Text weight="plus" size="large">
            New message
          </Text>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col gap-4 p-6">
          {/* Selected users */}
          <div className="flex flex-wrap items-center gap-2">
            <Text size="small" className="text-ui-fg-muted">
              To:
            </Text>

            {selectedUsers.map((user) => (
              <Badge key={user.id} size="small">
                {user.firstName} {user.lastName}
                <IconButton
                  size="2xsmall"
                  variant="transparent"
                  onClick={() => toggleUser(user)}
                >
                  <XMarkMini />
                </IconButton>
              </Badge>
            ))}
          </div>

          {/* Search */}
          <Input
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* User list */}
          <div className="flex flex-col rounded-md border border-ui-border-base divide-y">
            {filteredUsers.length === 0 && (
              <Text size="small" className="p-4 text-ui-fg-muted">
                No people found.
              </Text>
            )}

            {filteredUsers.map((user) => {
              const selected = selectedUsers.some((u) => u.id === user.id)

              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="flex items-center justify-between p-3 hover:bg-ui-bg-subtle transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.profile || "/placeholder.svg"}
                      className="h-8 w-8 rounded-full"
                      alt={user.username}
                    />
                    <div className="flex flex-col text-left">
                      <Text size="small" weight="plus">
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {user.username}
                      </Text>
                    </div>
                  </div>

                  {selected && <CheckMini />}
                </button>
              )
            })}
          </div>

          {/* Action */}
          <div className="flex justify-end pt-2">
            <Button
              disabled={selectedUsers.length === 0}
              onClick={() => {
                console.log("Start chat with:", selectedUsers)
              }}
            >
              Start chat
            </Button>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
