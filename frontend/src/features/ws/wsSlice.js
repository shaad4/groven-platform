import { createSlice } from "@reduxjs/toolkit";

const wsSlice = createSlice({
    name: 'ws',
    initialState: {
        connections: {},
    },
    reducers: {
        setStatus(state, { payload }){
            const { key, status } = payload
            state.connections[key] = status
        },
        removeConnection(state, { payload }) {
            delete state.connections[payload]
        },
    },
})

export const { setStatus , removeConnection } = wsSlice.actions

export const selectWsStatus = (key) => (s) => s.ws.connections[key] ?? 'disconnected'

export default wsSlice.reducer

