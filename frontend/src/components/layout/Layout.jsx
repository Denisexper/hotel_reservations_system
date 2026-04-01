import Sidebar from "./Sidebar";

function Layout(props) {
  return (
    <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-black">
      <Sidebar />
      <main class="flex-1 overflow-y-auto">{props.children}</main>
    </div>
  );
}

export default Layout;
