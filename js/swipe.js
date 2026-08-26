window.UniBuySwipe = (function () {

const viewer = document.getElementById("swipeViewer");  
const track = document.getElementById("swipeTrack");  
const closeBtn = document.getElementById("swipeClose");  

let originalProducts = [];  
let feed = [];  
let currentIndex = 0;  
let photoIndex = {};  
let likedIds = new Set();  
let notInterestedCategories = new Set();  

const RENDER_RADIUS = 1;  

/* =========================================================  
   HELPERS  
   ========================================================= */  

function formatPrice(amount) {  
    const number = Number(amount);  

    if (isNaN(number)) {  
        return "R 0";  
    }  

    return "R " + number.toLocaleString("en-ZA");  
}  


/* =========================================================  
   OPEN VIEWER  
   ========================================================= */  

function open(index, products) {  

    if (!viewer || !track) {  
        console.error("UniBuy Swipe viewer not found.");  
        return;  
    }  

    if (!Array.isArray(products) || !products.length) {  
        console.warn("No products available for swipe viewer.");  
        return;  
    }  

    originalProducts = products.slice();  
    feed = products.slice();  

    currentIndex = Math.max(  
        0,  
        Math.min(index, feed.length - 1)  
    );  

    photoIndex = {};  
    likedIds = new Set();  
    notInterestedCategories = new Set();  

    viewer.classList.remove("hidden");  

    viewer.setAttribute(  
        "aria-hidden",  
        "false"  
    );  

    document.body.style.overflow = "hidden";  

    renderSlides();  
    preloadAround(currentIndex);  

    attachGestures();  
}  


/* =========================================================  
   CLOSE VIEWER  
   ========================================================= */  

function close() {  

    if (!viewer || !track) return;  

    viewer.classList.add("hidden");  

    viewer.setAttribute(  
        "aria-hidden",  
        "true"  
    );  

    document.body.style.overflow = "";  

    track.innerHTML = "";  

    detachGestures();  
}  


/* =========================================================  
   EXTEND FEED  
   ========================================================= */  

function extendFeedIfNeeded() {  

    if (!originalProducts.length) {  
        return;  
    }  

    while (  
        feed.length <  
        currentIndex +  
        RENDER_RADIUS +  
        3  
    ) {  

        const pool =  
            originalProducts.filter(function (product) {  

                return !notInterestedCategories.has(  
                    product.category  
                );  

            });  

        const source =  
            pool.length  
                ? pool  
                : originalProducts;  

        if (!source.length) {  
            break;  
        }  

        feed.push(  
            source[  
                feed.length % source.length  
            ]  
        );  
    }  
}  


/* =========================================================  
   PRELOAD IMAGES  
   ========================================================= */  

function preloadAround(index) {  

    for (  
        let i = index - 1;  
        i <= index + 2;  
        i++  
    ) {  

        if (  
            i < 0 ||  
            i >= feed.length  
        ) {  
            continue;  
        }  

        const product = feed[i];  

        if (!product) {  
            continue;  
        }  

        const images =  
            (  
                product.images &&  
                Array.isArray(product.images) &&  
                product.images.length  
            )  
                ? product.images  
                : [product.image];  

        images.forEach(function (src) {  

            if (!src) return;  

            const img = new Image();  

            img.src = src;  

        });  
    }  
}  


/* =========================================================  
   ACTION BUTTON  
   ========================================================= */  

function actionButton(  
    action,  
    icon,  
    label,  
    activeClass  
) {  

    return (  

        '<button class="swipe-action-btn ' +  
        (activeClass || "") +  
        '" data-action="' +  
        action +  
        '" aria-label="' +  
        label +  
        '">' +  

            '<i class="fas ' +  
            icon +  
            '"></i>' +  

        "</button>" +  

        '<div class="swipe-action-col">' +  
        label +  
        "</div>"  
    );  
}  


/* =========================================================  
   BUILD SLIDE  
   ========================================================= */  

function buildSlide(product, pos) {  

    const slide =  
        document.createElement("div");  

    slide.className =  
        "swipe-slide";  

    slide.style.top =  
        (pos * 100) + "%";  

    slide.dataset.pos = pos;  


    /* ---------- IMAGES ---------- */  

    const images =  
        (  
            product.images &&  
            Array.isArray(product.images) &&  
            product.images.length  
        )  
            ? product.images  
            : [product.image];  

    photoIndex[pos] = 0;  

    const photosWrap =  
        document.createElement("div");  

    photosWrap.className =  
        "swipe-photos";  

    images.forEach(function (src) {  

        const photo =  
            document.createElement("div");  

        photo.className =  
            "swipe-photo";  

        const fallback =  
            "https://placehold.co/480x854/1a1a1a/ffffff?text=" +  
            encodeURIComponent(  
                product.name || "UniBuy"  
            );  

        photo.style.backgroundImage =  
            "url('" +  
            (src || fallback) +  
            "'), url('" +  
            fallback +  
            "')";  

        photosWrap.appendChild(photo);  

    });  

    slide.appendChild(  
        photosWrap  
    );  


    /* ---------- PHOTO DOTS ---------- */  

    if (images.length > 1) {  

        const dots =  
            document.createElement("div");  

        dots.className =  
            "swipe-dots";  

        images.forEach(function (_, i) {  

            const dot =  
                document.createElement("span");  

            if (i === 0) {  

                dot.classList.add(  
                    "active"  
                );  

            }  

            dots.appendChild(dot);  

        });  

        slide.appendChild(  
            dots  
        );  
    }  


    /* ---------- PRODUCT INFORMATION ---------- */  

    const info =  
        document.createElement("div");  

    info.className =  
        "swipe-info";  

    info.innerHTML =  

        (  
            product.premium  
                ? '<span class="swipe-premium-badge">PREMIUM</span>'  
                : ""  
        ) +  

        '<div class="swipe-name">' +  
            (product.name || "Product") +  
        "</div>" +  

        '<div class="swipe-price">' +  
            formatPrice(product.price) +  
        "</div>" +  

        '<div class="swipe-meta">' +  

            '<span>' +  
                '<i class="fas fa-store"></i> ' +  
                (product.seller || "Seller") +  
            "</span>" +  

            '<span>' +  
                '<i class="fas fa-location-dot"></i> ' +  
                (product.location || "Location not provided") +  
            "</span>" +  

        "</div>" +  

        '<div class="swipe-description">' +  
            (product.description || "No description provided.") +  
        "</div>" +  

        '<div class="swipe-cta-row">' +  

            '<button class="swipe-chat-btn" data-action="chat">' +  

                '<i class="fab fa-whatsapp"></i> ' +  

                "Chat with Seller" +  

            "</button>" +  

        "</div>";  

    slide.appendChild(  
        info  
    );  


    /* ---------- ACTIONS ---------- */  

    const actions =  
        document.createElement("div");  

    actions.className =  
        "swipe-actions";  

    actions.innerHTML =  

        actionButton(  
            "like",  
            "fa-heart",  
            String(product.likes || 0),  
            likedIds.has(product.id)  
                ? "liked"  
                : ""  
        ) +  

        actionButton(  
            "save",  
            "fa-bookmark",  
            "Save",  
            (  
                window.UniBuySaved &&  
                window.UniBuySaved.isSaved &&  
                window.UniBuySaved.isSaved(  
                    product.id  
                )  
            )  
                ? "saved"  
                : ""  
        ) +  

        actionButton(  
            "share",  
            "fa-share",  
            "Share",  
            ""  
        ) +  

        actionButton(  
            "not-interested",  
            "fa-ban",  
            "Not for me",  
            ""  
        );  

    slide.appendChild(  
        actions  
    );  


    /* ---------- TOAST ---------- */  

    const toast =  
        document.createElement("div");  

    toast.className =  
        "swipe-toast";  

    slide.appendChild(  
        toast  
    );  


    /* ---------- ACTION EVENTS ---------- */  

    actions.addEventListener(  
        "click",  
        function (e) {  

            const btn =  
                e.target.closest(  
                    ".swipe-action-btn"  
                );  

            if (!btn) return;  

            handleAction(  
                btn.dataset.action,  
                product,  
                btn,  
                toast  
            );  

        }  
    );  


    info.addEventListener(  
        "click",  
        function (e) {  

            const btn =  
                e.target.closest(  
                    "button[data-action]"  
                );  

            if (!btn) return;  

            handleAction(  
                btn.dataset.action,  
                product,  
                btn,  
                toast  
            );  

        }  
    );  


    return slide;  
}  


/* =========================================================  
   TOAST  
   ========================================================= */  

function showToast(  
    toastEl,  
    message  
) {  

    if (!toastEl) return;  

    toastEl.textContent =  
        message;  

    toastEl.classList.add(  
        "show"  
    );  

    setTimeout(  
        function () {  

            toastEl.classList.remove(  
                "show"  
            );  

        },  
        1400  
    );  
}  


/* =========================================================  
   HANDLE ACTION  
   ========================================================= */  

function handleAction(  
    action,  
    product,  
    btn,  
    toastEl  
) {  


    /* =========================  
       LIKE  
    ========================= */  

    if (action === "like") {  

        if (  
            likedIds.has(  
                product.id  
            )  
        ) {  

            likedIds.delete(  
                product.id  
            );  

            btn.classList.remove(  
                "liked"  
            );  

        } else {  

            likedIds.add(  
                product.id  
            );  

            btn.classList.add(  
                "liked"  
            );  

        }  

        return;  
    }  


    /* =========================  
       SAVE  
    ========================= */  

    if (action === "save") {  

        let nowSaved;  

        if (  
            window.UniBuySaved &&  
            typeof window.UniBuySaved.toggleSaved ===  
                "function"  
        ) {  

            nowSaved =  
                window.UniBuySaved.toggleSaved(  
                    product.id  
                );  

        } else {  

            nowSaved =  
                !btn.classList.contains(  
                    "saved"  
                );  

        }  

        btn.classList.toggle(  
            "saved",  
            nowSaved  
        );  

        showToast(  
            toastEl,  
            nowSaved  
                ? "Saved"  
                : "Removed from saved items"  
        );  

        return;  
    }  


    /* =========================  
       SHARE  
    ========================= */  

    if (action === "share") {  

        const shareUrl =  
            window.location.origin +  
            window.location.pathname +  
            "?product=" +  
            encodeURIComponent(  
                product.id  
            );  

        const shareData = {  

            title:  
                product.name ||  
                "UniBuy Product",  

            text:  
                (product.name || "Product") +  
                " - " +  
                formatPrice(  
                    product.price  
                ) +  
                " on UniBuy",  

            url:  
                shareUrl  

        };  

        if (  
            navigator.share  
        ) {  

            navigator.share(  
                shareData  
            ).catch(  
                function () {}  
            );  

        } else if (  
            navigator.clipboard &&  
            navigator.clipboard.writeText  
        ) {  

            navigator.clipboard.writeText(  
                shareUrl  
            ).then(  
                function () {  

                    showToast(  
                        toastEl,  
                        "Link copied to clipboard"  
                    );  
                }  
            ).catch(  
                function () {  

                    showToast(  
                        toastEl,  
                        "Share: " +  
                        shareUrl  
                    );  
                }  
            );  

        } else {  

            showToast(  
                toastEl,  
                "Share: " +  
                shareUrl  
            );  

        }  

        return;  
    }  


    /* =========================  
       NOT INTERESTED  
    ========================= */  

    if (  
        action ===  
        "not-interested"  
    ) {  

        if (  
            product.category  
        ) {  

            notInterestedCategories.add(  
                product.category  
            );  

        }  

        showToast(  
            toastEl,  
            "Got it — showing less like this"  
        );  

        setTimeout(  
            goToNext,  
            350  
        );  

        return;  
    }  


    /* =========================  
       BUY  
    ========================= */  

    if (action === "buy") {  

        showToast(  
            toastEl,  
            "Buy Now flow coming soon"  
        );  

        return;  
    }  


    /* =========================  
       CHAT WITH SELLER  
       WHATSAPP  
    ========================= */  

    if (action === "chat") {  

        if (!product || !product.id) {  

            showToast(  
                toastEl,  
                "Product information unavailable"  
            );  

            return;  
        }  


        /*  
         * app.js provides this function.  
         *  
         * It will use the product information  
         * and Firebase to find the seller's  
         * WhatsApp number.  
         */  

        if (  
            typeof window.contactSellerOnWhatsApp ===  
            "function"  
        ) {  

            window.contactSellerOnWhatsApp(  
                product  
            );  

        } else {  

            showToast(  
                toastEl,  
                "WhatsApp contact is unavailable"  
            );  

            console.error(  
                "contactSellerOnWhatsApp() is not available."  
            );  

        }  

        return;  
    }  
}  


/* =========================================================  
   RENDER SLIDES  
   ========================================================= */  

function renderSlides() {  

    extendFeedIfNeeded();  

    track.classList.add(  
        "no-transition"  
    );  

    track.style.transform =  
        "translateY(0%)";  

    track.innerHTML = "";  

    for (  
        let i =  
            currentIndex -  
            RENDER_RADIUS;  

        i <=  
            currentIndex +  
            RENDER_RADIUS;  

        i++  
    ) {  

        if (i < 0) {  
            continue;  
        }  

        const product =  
            feed[i];  

        if (!product) {  
            continue;  
        }  

        const pos =  
            i -  
            currentIndex;  

        track.appendChild(  
            buildSlide(  
                product,  
                pos  
            )  
        );  
    }  

    track.offsetHeight;  

    track.classList.remove(  
        "no-transition"  
    );  
}  


/* =========================================================  
   NEXT  
   ========================================================= */  

function goToNext() {  

    currentIndex += 1;  

    extendFeedIfNeeded();  

    animateTo(  
        -1,  
        function () {  

            renderSlides();  

            preloadAround(  
                currentIndex  
            );  

        }  
    );  
}  


/* =========================================================  
   PREVIOUS  
   ========================================================= */  

function goToPrevious() {  

    if (  
        currentIndex <= 0  
    ) {  
        return;  
    }  

    currentIndex -= 1;  

    animateTo(  
        1,  
        function () {  

            renderSlides();  

            preloadAround(  
                currentIndex  
            );  

        }  
    );  
}  


/* =========================================================  
   ANIMATION  
   ========================================================= */  

function animateTo(  
    direction,  
    done  
) {  

    track.classList.remove(  
        "no-transition"  
    );  

    track.style.transform =  
        "translateY(" +  
        (direction * 100) +  
        "%)";  

    setTimeout(  
        function () {  

            track.classList.add(  
                "no-transition"  
            );  

            done();  

            track.offsetHeight;  

            track.classList.remove(  
                "no-transition"  
            );  

        },  
        400  
    );  
}  


/* =========================================================  
   SHIFT PRODUCT PHOTO  
   ========================================================= */  

function shiftPhoto(  
    slideEl,  
    delta  
) {  

    const pos =  
        Number(  
            slideEl.dataset.pos  
        );  

    const photosWrap =  
        slideEl.querySelector(  
            ".swipe-photos"  
        );  

    if (!photosWrap) {  
        return;  
    }  

    const total =  
        photosWrap.children.length;  

    if (total <= 1) {  
        return;  
    }  

    let index =  
        (photoIndex[pos] || 0) +  
        delta;  

    index =  
        Math.max(  
            0,  
            Math.min(  
                total - 1,  
                index  
            )  
        );  

    photoIndex[pos] =  
        index;  

    photosWrap.style.transform =  
        "translateX(-" +  
        (index * 100) +  
        "%)";  

    const dots =  
        slideEl.querySelectorAll(  
            ".swipe-dots span"  
        );  

    dots.forEach(  
        function (dot, i) {  

            dot.classList.toggle(  
                "active",  
                i === index  
            );  

        }  
    );  
}  


/* =========================================================  
   TOUCH VARIABLES  
   ========================================================= */  

let startX = 0;  
let startY = 0;  
let isDragging = false;  
let axisLocked = null;  


/* =========================================================  
   TOUCH START  
   ========================================================= */  

function onTouchStart(e) {  

    const t =  
        e.touches  
            ? e.touches[0]  
            : e;  

    startX =  
        t.clientX;  

    startY =  
        t.clientY;  

    isDragging =  
        true;  

    axisLocked =  
        null;  
}  


/* =========================================================  
   TOUCH MOVE  
   ========================================================= */  

function onTouchMove(e) {  

    if (!isDragging) {  
        return;  
    }  

    const t =  
        e.touches  
            ? e.touches[0]  
            : e;  

    const dx =  
        t.clientX -  
        startX;  

    const dy =  
        t.clientY -  
        startY;  

    if (!axisLocked) {  

        if (  
            Math.abs(dx) > 10 ||  
            Math.abs(dy) > 10  
        ) {  

            axisLocked =  
                Math.abs(dx) >  
                Math.abs(dy)  
                    ? "x"  
                    : "y";  
        }  
    }  

    if (  
        axisLocked === "y" &&  
        e.cancelable  
    ) {  

        e.preventDefault();  

    }  
}  


/* =========================================================  
   TOUCH END  
   ========================================================= */  

function onTouchEnd(e) {  

    if (!isDragging) {  
        return;  
    }  

    isDragging =  
        false;  

    const t =  
        e.changedTouches  
            ? e.changedTouches[0]  
            : e;  

    const dx =  
        t.clientX -  
        startX;  

    const dy =  
        t.clientY -  
        startY;  

    const THRESHOLD =  
        50;  


    /* ---------- VERTICAL ---------- */  

    if (  
        axisLocked === "y"  
    ) {  

        if (  
            dy < -THRESHOLD  
        ) {  

            goToNext();  

        } else if (  
            dy > THRESHOLD  
        ) {  

            goToPrevious();  

        }  

        return;  
    }  


    /* ---------- HORIZONTAL ---------- */  

    if (  
        axisLocked === "x"  
    ) {  

        const slideEl =  
            e.target.closest  
                ? e.target.closest(  
                    ".swipe-slide"  
                )  
                : null;  

        if (!slideEl) {  
            return;  
        }  

        if (  
            dx < -THRESHOLD  
        ) {  

            shiftPhoto(  
                slideEl,  
                1  
            );  

        } else if (  
            dx > THRESHOLD  
        ) {  

            shiftPhoto(  
                slideEl,  
                -1  
            );  

        }  
    }  
}  


/* =========================================================  
   KEYBOARD  
   ========================================================= */  

function onKeyDown(e) {  

    if (  
        viewer.classList.contains(  
            "hidden"  
        )  
    ) {  
        return;  
    }  

    if (  
        e.key === "Escape"  
    ) {  

        close();  

    } else if (  
        e.key === "ArrowUp"  
    ) {  

        goToNext();  

    } else if (  
        e.key === "ArrowDown"  
    ) {  

        goToPrevious();  

    } else if (  
        e.key === "ArrowRight" ||  
        e.key === "ArrowLeft"  
    ) {  

        const activeSlide =  
            track.querySelector(  
                '.swipe-slide[data-pos="0"]'  
            );  

        if (activeSlide) {  

            shiftPhoto(  
                activeSlide,  
                e.key === "ArrowRight"  
                    ? 1  
                    : -1  
            );  

        }  
    }  
}  


/* =========================================================  
   ATTACH GESTURES  
   ========================================================= */  

function attachGestures() {  

    track.addEventListener(  
        "touchstart",  
        onTouchStart,  
        { passive: true }  
    );  

    track.addEventListener(  
        "touchmove",  
        onTouchMove,  
        { passive: false }  
    );  

    track.addEventListener(  
        "touchend",  
        onTouchEnd  
    );  

    document.addEventListener(  
        "keydown",  
        onKeyDown  
    );  
}  


/* =========================================================  
   DETACH GESTURES  
   ========================================================= */  

function detachGestures() {  

    track.removeEventListener(  
        "touchstart",  
        onTouchStart  
    );  

    track.removeEventListener(  
        "touchmove",  
        onTouchMove  
    );  

    track.removeEventListener(  
        "touchend",  
        onTouchEnd  
    );  

    document.removeEventListener(  
        "keydown",  
        onKeyDown  
    );  
}  


/* =========================================================  
   CLOSE BUTTON  
   ========================================================= */  

if (closeBtn) {  

    closeBtn.addEventListener(  
        "click",  
        close  
    );  

}  


/* =========================================================  
   PUBLIC API  
   ========================================================= */  

return {  

    open: open,  
    close: close  

};

})();