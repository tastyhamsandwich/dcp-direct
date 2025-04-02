
import './settings.modules.css';

export default function SettingsPage() {
    return (
        <div className="outer-container flex flex-col items-center h-screen">
            <h2 className="text-2xl font-bold">Placeholder for Settings</h2>
            <div className="profile-settings">
              Profile Settings:
              <div className="email border-2 rounded-xl border-green-300 bg-gray-100 text-black p-2 w-64 bold broder-double shadow-gray-500 shadow-md hover:shadow-inner hover:shadow-black">
                E-Mail Address
              </div>
            </div>

        </div>
    )
}
