import { useContext } from "react";
import { BadgeContext } from "../context/BadgeContext";


export function useBadges(){
    const context = useContext(BadgeContext)

    if (!context) {
        throw new Error(
        'useBadges must be used within BadgeProvider'
        )
    }

    return context
}