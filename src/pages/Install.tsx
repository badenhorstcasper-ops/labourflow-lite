import { useState } from "react";
import { Button } from "@/components/ui/button";
import BackHomeBar from "@/components/BackHomeBar";
import { getInstallPrompt, triggerInstall, subscribeInstall, isStandalone } from "@/lib/pwaInstall";
import { useEffect } from "react";

export default function Install() {
  const selected = new URLSearchParams(window.location.search).get("icon") === "cara" ? "cara" : "logo";
  const [ready, setReady] = useState(!!getInstallPrompt());
  const [installed, setInstalled] = useState(isStandalone());
  const [notice, setNotice] = useState("");
  useEffect(() => subscribeInstall(() => setReady(!!getInstallPrompt())), []);
  const choose = (icon: string) => {
    if (icon === selected) return;
    window.location.assign(`/install?icon=${icon}`);
  };
  const install = async () => {
    const result = await triggerInstall();
    if (result === "accepted") setInstalled(true);
    if (result === "unavailable") setNotice("Use your browser menu to add the shortcut with your chosen picture.");
  };
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-lg space-y-6">
        <BackHomeBar homeTo="/app" />
        <header><h1>Choose your shortcut picture</h1><p className="mt-2 text-muted-foreground">The same iNRECO app, with the picture you prefer on this device.</p></header>
        <div role="group" aria-label="Shortcut picture" className="grid grid-cols-2 gap-4">
          {([{ id: "logo", name: "iNRECO logo", url: "/icon-192.png" }, { id: "cara", name: "CARA avatar", url: "/cara-icon-192.png" }]).map((option) => (
            <Button key={option.id} variant={selected === option.id ? "default" : "outline"} aria-pressed={selected === option.id} onClick={() => choose(option.id)} className="h-auto min-h-44 flex-col gap-3 whitespace-normal py-4">
              <img src={option.url} alt="" className="h-24 w-24 rounded-2xl object-contain" />
              {option.name}{selected === option.id && <span className="text-sm">Selected</span>}
            </Button>
          ))}
        </div>
        {installed ? <p role="status">iNRECO is installed. To change an existing shortcut picture, remove that shortcut and install again.</p> : <>
          {ready && <Button className="w-full" onClick={install}>Install with {selected === "cara" ? "CARA" : "the iNRECO logo"}</Button>}
          <p className="text-muted-foreground">On iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen. On Android, use Chrome’s menu and choose Install app or Add to Home screen.</p>
          <p className="text-sm text-muted-foreground">Check the picture in your phone’s confirmation screen before adding it. Some browsers use their own shortcut picture. Changing an existing shortcut may require removing it and installing again.</p>
          {notice && <p role="status">{notice}</p>}
        </>}
        <Button variant="outline" className="w-full" onClick={() => window.location.assign("/app")}>Continue to CARA without installing</Button>
      </div>
    </main>
  );
}