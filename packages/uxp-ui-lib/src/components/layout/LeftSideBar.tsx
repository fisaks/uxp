import React, { useRef, useState } from "react";
import { FloatingSidebarButton } from "./FloatingSidebarButton";
import { Sidebar, SidebarMenuItems } from "./Sidebar";

type LeftSideBarProps = {
    isDesktop: boolean;
    menuItems: SidebarMenuItems[];
};
export const LeftSideBar: React.FC<LeftSideBarProps> = ({ isDesktop, menuItems }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const drawerRootRef = useRef<HTMLDivElement>(null);
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <>
            <Sidebar
                isDesktop={isDesktop}
                sidebarOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                sidebarMenuItems={menuItems}
                drawerRootRef={drawerRootRef}
            />
            {!isDesktop && <FloatingSidebarButton toggleSidebar={toggleSidebar} />}
            <div ref={drawerRootRef}></div>
        </>
    );
};

export default LeftSideBar;
